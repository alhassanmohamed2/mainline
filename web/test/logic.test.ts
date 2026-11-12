import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CommitNode, RepoSnapshot } from '@mainline/shared';
import { buildFileRows } from '../src/features/board/fileRows.ts';
import { countConflicts, resolveConflicts } from '../src/features/editor/conflict.ts';
import { describeEffects } from '../src/features/effects/describeEffects.ts';
import { edgePath, layoutMap } from '../src/features/map/layout.ts';
import { parseAnsi, stripAnsi } from '../src/lib/ansi.ts';
import { commandParts } from '../src/lib/commandParts.ts';

const commit = (sha: string, parents: string[] = [], reachable = true): CommitNode => ({
  sha,
  parents,
  subject: `commit ${sha}`,
  author: 'Ada',
  date: '2026-01-01T00:00:00Z',
  reachable,
});

function snapshot(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    takenAt: 0,
    exists: true,
    head: { kind: 'unborn', branch: 'main' },
    branches: [],
    remoteBranches: [],
    tags: [],
    commits: [],
    commitsTruncated: false,
    worktree: [],
    worktreeTruncated: false,
    index: [],
    headTree: [],
    stashes: [],
    remotes: [],
    operation: null,
    internals: { headFile: 'ref: refs/heads/main', looseObjects: 0, packedObjects: 0 },
    ...overrides,
  };
}

/* ------------------------------- three trees ------------------------------ */

test('an untracked file is only in the working directory', () => {
  const [row] = buildFileRows(snapshot({ worktree: [{ path: 'a.txt', oid: 'aaa', ignored: false }] }));
  assert.equal(row?.worktree.label, 'untracked');
  assert.equal(row?.index.present, false);
  assert.equal(row?.head.present, false);
  assert.equal(row?.changed, true);
});

test('a staged new file matches the working copy and differs from the commit', () => {
  const [row] = buildFileRows(
    snapshot({ worktree: [{ path: 'a.txt', oid: 'aaa', ignored: false }], index: [{ path: 'a.txt', oid: 'aaa', stage: 0 }] }),
  );
  assert.equal(row?.worktree.tone, 'clean');
  assert.equal(row?.index.label, 'new file');
});

test('a file can be modified in both places at once', () => {
  const [row] = buildFileRows(
    snapshot({
      worktree: [{ path: 'a.txt', oid: 'ccc', ignored: false }],
      index: [{ path: 'a.txt', oid: 'bbb', stage: 0 }],
      headTree: [{ path: 'a.txt', oid: 'aaa' }],
    }),
  );
  assert.equal(row?.worktree.label, 'modified');
  assert.equal(row?.index.label, 'modified');
});

test('a committed, untouched file is clean everywhere', () => {
  const [row] = buildFileRows(
    snapshot({
      worktree: [{ path: 'a.txt', oid: 'aaa', ignored: false }],
      index: [{ path: 'a.txt', oid: 'aaa', stage: 0 }],
      headTree: [{ path: 'a.txt', oid: 'aaa' }],
    }),
  );
  assert.equal(row?.changed, false);
});

test('a file deleted on disk is reported against the staging area', () => {
  const [row] = buildFileRows(snapshot({ index: [{ path: 'a.txt', oid: 'aaa', stage: 0 }], headTree: [{ path: 'a.txt', oid: 'aaa' }] }));
  assert.equal(row?.worktree.label, 'deleted');
  assert.equal(row?.worktree.present, false);
});

test('a conflicted path is unmerged in the staging area', () => {
  const [row] = buildFileRows(
    snapshot({
      worktree: [{ path: 'a.txt', oid: 'mmm', ignored: false }],
      index: [1, 2, 3].map((stage) => ({ path: 'a.txt', oid: `s${stage}`, stage })),
      headTree: [{ path: 'a.txt', oid: 's2' }],
    }),
  );
  assert.equal(row?.conflicted, true);
  assert.equal(row?.index.label, 'unmerged');
});

test('ignored files sort last', () => {
  const rows = buildFileRows(
    snapshot({
      worktree: [
        { path: 'a.tmp', oid: 'x', ignored: true },
        { path: 'z.txt', oid: 'y', ignored: false },
      ],
    }),
  );
  assert.deepEqual(rows.map((row) => row.path), ['z.txt', 'a.tmp']);
});

/* --------------------------------- effects -------------------------------- */

const texts = (before: RepoSnapshot, after: RepoSnapshot) => describeEffects(before, after).map((effect) => effect.text);

test('a read-only command changes nothing', () => {
  const same = snapshot();
  assert.deepEqual(texts(same, same), ['Nothing changed. This command only reads.']);
});

test('git init is described', () => {
  assert.match(texts(snapshot({ exists: false, head: null }), snapshot())[0] ?? '', /became a repository/);
});

test('git add is described as staging', () => {
  const before = snapshot({ worktree: [{ path: 'a.txt', oid: 'aaa', ignored: false }] });
  const after = snapshot({ ...before, index: [{ path: 'a.txt', oid: 'aaa', stage: 0 }] });
  assert.ok(texts(before, after).some((text) => /`a\.txt` staged/.test(text)));
});

test('a commit reports the new commit and the branch that moved', () => {
  const tree = { worktree: [{ path: 'a.txt', oid: 'aaa', ignored: false }], index: [{ path: 'a.txt', oid: 'aaa', stage: 0 }] };
  const before = snapshot(tree);
  const after = snapshot({
    ...tree,
    head: { kind: 'branch', branch: 'main', sha: 'c1c1c1c1' },
    branches: [{ name: 'main', sha: 'c1c1c1c1', upstream: null, ahead: 0, behind: 0, upstreamGone: false }],
    commits: [commit('c1c1c1c1')],
    headTree: [{ path: 'a.txt', oid: 'aaa' }],
  });
  const result = texts(before, after);
  assert.ok(result.some((text) => /New commit `c1c1c1c`/.test(text) && /first commit/.test(text)));
  assert.ok(result.some((text) => /Branch `main` created/.test(text)));
});

test('a reset that orphans a commit reports the ghost and the branch moving back', () => {
  const branch = (sha: string) => [{ name: 'main', sha, upstream: null, ahead: 0, behind: 0, upstreamGone: false }];
  const before = snapshot({
    head: { kind: 'branch', branch: 'main', sha: 'bbbbbbbb' },
    branches: branch('bbbbbbbb'),
    commits: [commit('bbbbbbbb', ['aaaaaaaa']), commit('aaaaaaaa')],
  });
  const after = snapshot({
    head: { kind: 'branch', branch: 'main', sha: 'aaaaaaaa' },
    branches: branch('aaaaaaaa'),
    commits: [commit('bbbbbbbb', ['aaaaaaaa'], false), commit('aaaaaaaa')],
  });
  const result = texts(before, after);
  assert.ok(result.some((text) => /no longer reachable/.test(text)));
  assert.ok(result.some((text) => /`main` moved back/.test(text)));
});

test('switching branches reports where HEAD went', () => {
  const branches = ['main', 'topic'].map((name) => ({ name, sha: 'aaaaaaaa', upstream: null, ahead: 0, behind: 0, upstreamGone: false }));
  const base = { branches, commits: [commit('aaaaaaaa')] };
  const before = snapshot({ ...base, head: { kind: 'branch', branch: 'main', sha: 'aaaaaaaa' } });
  const after = snapshot({ ...base, head: { kind: 'branch', branch: 'topic', sha: 'aaaaaaaa' } });
  assert.deepEqual(texts(before, after), ['HEAD now points at `topic` (it was on `main`).']);
});

/* ----------------------------------- map ---------------------------------- */

test('a straight history stays on the main track', () => {
  const layout = layoutMap([commit('c', ['b']), commit('b', ['a']), commit('a')], 'c');
  assert.deepEqual(layout.placed.map((entry) => entry.lane), [0, 0, 0]);
  assert.equal(layout.laneCount, 1);
});

test('a branch ahead of main gets its own track and bends into main', () => {
  // main is at b; topic has d -> c -> b
  const layout = layoutMap([commit('d', ['c']), commit('c', ['b']), commit('b', ['a']), commit('a')], 'b');
  assert.deepEqual(layout.placed.map((entry) => entry.lane), [1, 1, 0, 0]);
  const joining = layout.edges.find((edge) => edge.fromRow === 1 && edge.toRow === 2);
  assert.deepEqual([joining?.fromLane, joining?.viaLane, joining?.toLane], [1, 1, 0]);
});

test('a merge commit sits on main with a second line coming in', () => {
  // m merges topic (t) into main (b); both fork from a
  const layout = layoutMap([commit('m', ['b', 't']), commit('t', ['a']), commit('b', ['a']), commit('a')], 'm');
  const lanes = Object.fromEntries(layout.placed.map((entry) => [entry.commit.sha, entry.lane]));
  assert.deepEqual(lanes, { m: 0, t: 1, b: 0, a: 0 });
  assert.equal(layout.edges.length, 4);
  assert.equal(layout.laneCount, 2);
});

test('edges to unreachable commits are ghosts', () => {
  const layout = layoutMap([commit('x', ['a'], false), commit('b', ['a']), commit('a')], 'b');
  assert.equal(layout.edges.find((edge) => edge.fromRow === 0)?.ghost, true);
  assert.equal(layout.edges.find((edge) => edge.fromRow === 1)?.ghost, false);
});

test('a history cut off by the commit limit does not break the layout', () => {
  const layout = layoutMap([commit('c', ['b']), commit('b', ['missing'])], 'c');
  assert.equal(layout.edges.length, 1);
});

test('edge paths start at the child and end at the parent', () => {
  const layout = layoutMap([commit('d', ['c']), commit('c', ['b']), commit('b', ['a']), commit('a')], 'b');
  const x = (lane: number) => 10 + lane * 20;
  const y = (row: number) => 25 + row * 50;
  for (const edge of layout.edges) {
    const path = edgePath(edge, x, y);
    assert.ok(path.startsWith(`M ${x(edge.fromLane)} ${y(edge.fromRow)}`));
    assert.ok(path.endsWith(`${x(edge.toLane)} ${y(edge.toRow)}`));
  }
});

/* ------------------------------ small helpers ----------------------------- */

test('ANSI colours become styled spans', () => {
  const spans = parseAnsi('plain \x1b[31mred\x1b[0m \x1b[1;32mbold green\x1b[m');
  assert.deepEqual(
    spans.map((span) => [span.text, span.color, Boolean(span.bold)]),
    [
      ['plain ', undefined, false],
      ['red', 'var(--ansi-red)', false],
      [' ', undefined, false],
      ['bold green', 'var(--ansi-green)', true],
    ],
  );
});

test('other escape sequences and progress redraws are dropped', () => {
  assert.equal(stripAnsi('\x1b]8;;https://x\x07link\x1b]8;;\x07 \x1b[2Kdone'), 'link done');
  assert.equal(stripAnsi('Counting: 10%\rCounting: 100%\r\ndone\n'), 'Counting: 100%\ndone\n');
});

test('conflict markers are counted and resolved', () => {
  const text = ['top', '<<<<<<< HEAD', 'mine', '=======', 'theirs', '>>>>>>> topic', 'bottom'].join('\n');
  assert.equal(countConflicts(text), 1);
  assert.equal(resolveConflicts(text, 'both'), 'top\nmine\ntheirs\nbottom');
  assert.equal(resolveConflicts(text, 'ours'), 'top\nmine\nbottom');
  assert.equal(resolveConflicts(text, 'theirs'), 'top\ntheirs\nbottom');
});

test('diff3-style conflicts drop the base section', () => {
  const text = ['<<<<<<< HEAD', 'mine', '||||||| base', 'old', '=======', 'theirs', '>>>>>>> topic'].join('\n');
  assert.equal(resolveConflicts(text, 'both'), 'mine\ntheirs');
});

test('command lines are split into coloured parts', () => {
  assert.deepEqual(
    commandParts('git commit -m "Add the Red Line"').map((part) => part.kind),
    ['program', 'verb', 'flag', 'string'],
  );
  assert.deepEqual(
    commandParts('echo "x" >> a.txt').map((part) => part.kind),
    ['program', 'string', 'operator', 'argument'],
  );
});
