import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plan, type Plan } from '../src/exec/policy.ts';
import { tokenize } from '../src/exec/tokenize.ts';

const planFor = (command: string): Plan => plan(tokenize(command));

function spawned(command: string) {
  const planned = planFor(command);
  assert.equal(planned.kind, 'spawn', `${command} should be run`);
  return planned as Extract<Plan, { kind: 'spawn' }>;
}

function rejected(command: string) {
  const planned = planFor(command);
  assert.equal(planned.kind, 'reject', `${command} should be rejected`);
  return planned as Extract<Plan, { kind: 'reject' }>;
}

test('local git commands run without confirmation', () => {
  for (const command of ['git status', 'git commit -m "x"', 'git -c user.name=Ada commit -m x', 'git remote add origin https://example.com/r.git']) {
    const planned = spawned(command);
    assert.equal(planned.impact, 'local');
    assert.equal(planned.confirmation, null);
  }
});

test('downloading from a remote needs no confirmation', () => {
  for (const command of ['git fetch', 'git pull', 'git clone https://example.com/r.git']) {
    const planned = spawned(command);
    assert.equal(planned.impact, 'network-read');
    assert.equal(planned.confirmation, null);
  }
});

test('git push always asks first', () => {
  const planned = spawned('git push -u origin main');
  assert.equal(planned.impact, 'remote-write');
  assert.ok(planned.confirmation);
  assert.equal(planned.confirmation.danger, false);
});

test('force pushes and remote deletions are flagged as dangerous', () => {
  assert.equal(spawned('git push --force').confirmation?.danger, true);
  assert.equal(spawned('git push origin --delete feature').confirmation?.danger, true);
  assert.equal(spawned('git push origin +main').confirmation?.danger, true);
});

test('git may not be pointed at another folder', () => {
  rejected('git -C /etc status');
  rejected('git --git-dir=/tmp/other/.git log');
  rejected('git --work-tree /tmp status');
});

test('git commands that need a window or a daemon are rejected', () => {
  rejected('git gui');
  rejected('git instaweb');
});

test('read-only gh commands run without confirmation', () => {
  for (const command of ['gh auth status', 'gh repo view', 'gh pr list --state all', 'gh issue view 1', 'gh api user', 'gh --version', 'gh pr create --help']) {
    assert.equal(spawned(command).confirmation, null, command);
  }
});

test('gh commands that change GitHub ask first', () => {
  for (const command of [
    'gh repo create demo --private',
    'gh issue create --title a --body b',
    'gh pr create --title a --body b',
    'gh pr merge --squash --delete-branch',
    'gh release create v1.0',
    'gh api -X PUT repos/o/r/contents/a.md -f message=x',
    'gh api repos/o/r/issues -f title=x',
    'gh label create bug',
  ]) {
    const planned = spawned(command);
    assert.equal(planned.impact, 'remote-write', command);
    assert.ok(planned.confirmation, command);
  }
});

test('deleting a repository is flagged as dangerous', () => {
  assert.equal(spawned('gh repo delete me/demo --yes').confirmation?.danger, true);
});

test('a public repository is called out in the confirmation', () => {
  const details = spawned('gh repo create demo --public').confirmation?.details.join(' ') ?? '';
  assert.match(details, /PUBLIC/);
});

test('gh commands that touch credentials or run other programs are rejected', () => {
  for (const command of ['gh auth token', 'gh auth login', 'gh auth logout', 'gh extension install x/y', 'gh alias set co "pr checkout"', 'gh secret set X']) {
    rejected(command);
  }
});

test('only git, gh and the file helpers can be started', () => {
  rejected('rm-rf /');
  rejected('curl https://example.com');
  rejected('bash -c "git status"');
  assert.match(rejected('cd ..').hint ?? '', /playground/);
});

test('shell operators are rejected', () => {
  rejected('git log | head');
  rejected('git add . && git commit -m x');
  rejected('git status; git log');
  rejected('git log > out.txt');
});

test('echo may redirect into a file, once, at the end', () => {
  const planned = planFor('echo "hello" >> notes.txt');
  assert.equal(planned.kind, 'builtin');
  assert.deepEqual((planned as Extract<Plan, { kind: 'builtin' }>).redirect, { mode: 'append', target: 'notes.txt' });
  rejected('echo a > b > c');
  rejected('echo a >');
});
