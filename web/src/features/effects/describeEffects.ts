import type { CommitNode, HeadState, RepoSnapshot } from '@mainline/shared';
import { plural, shortSha } from '../../lib/format.ts';
import { buildFileRows } from '../board/fileRows.ts';

/**
 * Compares the repository before and after a command and says, in plain
 * words, what actually changed. Nothing here is scripted: it is derived from
 * the two real snapshots.
 */

export type EffectKind = 'repo' | 'worktree' | 'staged' | 'commit' | 'ref' | 'remote' | 'ghost' | 'stash' | 'none';

export interface Effect {
  kind: EffectKind;
  /** May contain `code` markup. */
  text: string;
}

const code = (text: string) => `\`${text}\``;
const sha = (value: string) => code(shortSha(value));

function listPaths(paths: string[]): string {
  const shown = paths.slice(0, 3).map(code).join(', ');
  return paths.length > 3 ? `${shown} and ${paths.length - 3} more` : shown;
}

function isAncestor(commits: Map<string, CommitNode>, ancestor: string, descendant: string): boolean {
  const queue = [descendant];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current === ancestor) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(commits.get(current)?.parents ?? []));
  }
  return false;
}

function headTarget(head: HeadState | null): string {
  if (!head) return 'nothing';
  return head.kind === 'detached' ? `commit ${sha(head.sha)}` : code(head.branch);
}

const headSha = (head: HeadState | null) => (head && head.kind !== 'unborn' ? head.sha : null);

export function describeEffects(before: RepoSnapshot | null, after: RepoSnapshot): Effect[] {
  if (!before) return [];
  const effects: Effect[] = [];
  const add = (kind: EffectKind, text: string) => effects.push({ kind, text });

  if (!before.exists && after.exists) {
    add('repo', 'The folder became a repository: the `.git` folder now exists.');
  } else if (before.exists && !after.exists) {
    add('repo', 'The `.git` folder is gone, so this is a plain folder again.');
    return effects;
  }

  /* Commits */
  const beforeCommits = new Map(before.commits.map((commit) => [commit.sha, commit]));
  const afterCommits = new Map(after.commits.map((commit) => [commit.sha, commit]));
  const created = after.commits.filter((commit) => !beforeCommits.has(commit.sha) && commit.reachable);

  for (const commit of created.slice(0, 3)) {
    const lineage =
      commit.parents.length === 0
        ? ' It has no parent: it is the first commit.'
        : commit.parents.length > 1
          ? ` It is a merge commit with ${commit.parents.length} parents.`
          : '';
    add('commit', `New commit ${sha(commit.sha)}: "${commit.subject}".${lineage}`);
  }
  if (created.length > 3) add('commit', `${created.length - 3} more new commits.`);

  const orphaned = after.commits.filter((commit) => !commit.reachable && beforeCommits.get(commit.sha)?.reachable);
  if (orphaned.length === 1) {
    add('ghost', `Commit ${sha(orphaned[0]!.sha)} is no longer reachable from any branch. It still exists; the reflog remembers it.`);
  } else if (orphaned.length > 1) {
    add('ghost', `${orphaned.length} commits are no longer reachable from any branch. They still exist; the reflog remembers them.`);
  }
  const rescued = after.commits.filter((commit) => commit.reachable && beforeCommits.get(commit.sha)?.reachable === false);
  if (rescued.length > 0) {
    add('commit', `${rescued.length === 1 ? `Commit ${sha(rescued[0]!.sha)} is` : `${rescued.length} commits are`} reachable again.`);
  }

  /* HEAD */
  if (before.exists && headTarget(before.head) !== headTarget(after.head)) {
    const { head } = after;
    if (head?.kind === 'detached') {
      if (before.head?.kind === 'detached') add('ref', `HEAD moved to commit ${sha(head.sha)} (still detached).`);
      else add('ref', `HEAD is detached: it points straight at commit ${sha(head.sha)} instead of a branch.`);
    } else if (head) {
      add('ref', `HEAD now points at ${code(head.branch)} (it was on ${headTarget(before.head)}).`);
    }
  }

  /* Branches, remote branches, tags */
  const diffRefs = (
    kind: EffectKind,
    previous: { name: string; sha: string }[],
    current: { name: string; sha: string }[],
    words: { created: (name: string, at: string) => string; deleted: (name: string) => string },
  ) => {
    const old = new Map(previous.map((ref) => [ref.name, ref.sha]));
    const now = new Map(current.map((ref) => [ref.name, ref.sha]));
    for (const [name, at] of now) {
      const was = old.get(name);
      if (was === undefined) add(kind, words.created(name, at));
      else if (was !== at) {
        if (isAncestor(afterCommits, was, at)) add(kind, `${code(name)} moved forward: ${sha(was)} → ${sha(at)}.`);
        else if (isAncestor(afterCommits, at, was)) add(kind, `${code(name)} moved back: ${sha(was)} → ${sha(at)}.`);
        else add(kind, `${code(name)} now points at ${sha(at)} (was ${sha(was)}).`);
      }
    }
    for (const name of old.keys()) if (!now.has(name)) add(kind, words.deleted(name));
  };

  diffRefs('ref', before.branches, after.branches, {
    created: (name, at) => `Branch ${code(name)} created, pointing at ${sha(at)}.`,
    deleted: (name) => `Branch ${code(name)} deleted. Only the label is gone, not the commits.`,
  });
  diffRefs('remote', before.remoteBranches, after.remoteBranches, {
    created: (name, at) => `${code(name)} appeared at ${sha(at)}: your record of that branch on the remote.`,
    deleted: (name) => `${code(name)} was removed: the branch no longer exists on the remote.`,
  });
  diffRefs('ref', before.tags, after.tags, {
    created: (name, at) => `Tag ${code(name)} created on ${sha(at)}.`,
    deleted: (name) => `Tag ${code(name)} deleted.`,
  });

  /* Tracking */
  const currentBranch = after.head && after.head.kind !== 'detached' ? after.head.branch : null;
  const tracked = after.branches.find((branch) => branch.name === currentBranch);
  const trackedBefore = before.branches.find((branch) => branch.name === currentBranch);
  if (tracked?.upstream) {
    if (!trackedBefore?.upstream) {
      add('remote', `${code(tracked.name)} now tracks ${code(tracked.upstream)}.`);
    } else if (trackedBefore.ahead !== tracked.ahead || trackedBefore.behind !== tracked.behind) {
      if (tracked.ahead === 0 && tracked.behind === 0) add('remote', `${code(tracked.name)} and ${code(tracked.upstream)} are in sync.`);
      else {
        const parts = [
          tracked.ahead > 0 ? `${plural(tracked.ahead, 'commit')} ahead of` : '',
          tracked.behind > 0 ? `${plural(tracked.behind, 'commit')} behind` : '',
        ].filter(Boolean);
        add('remote', `${code(tracked.name)} is ${parts.join(' and ')} ${code(tracked.upstream)}.`);
      }
    }
  }

  /* Remotes */
  const remotesBefore = new Map(before.remotes.map((remote) => [remote.name, remote.url]));
  const remotesAfter = new Map(after.remotes.map((remote) => [remote.name, remote.url]));
  for (const [name, url] of remotesAfter) {
    if (!remotesBefore.has(name)) add('remote', `Remote ${code(name)} registered: ${url}`);
    else if (remotesBefore.get(name) !== url) add('remote', `Remote ${code(name)} now points at ${url}`);
  }
  for (const name of remotesBefore.keys()) if (!remotesAfter.has(name)) add('remote', `Remote ${code(name)} removed.`);

  /* The three trees */
  const rowsBefore = new Map(buildFileRows(before).map((row) => [row.path, row]));
  const rowsAfter = new Map(buildFileRows(after).map((row) => [row.path, row]));
  const headMoved = headSha(before.head) !== headSha(after.head);

  const groups: Record<'created' | 'edited' | 'removed' | 'staged' | 'unstaged' | 'conflicted' | 'resolved', string[]> = {
    created: [],
    edited: [],
    removed: [],
    staged: [],
    unstaged: [],
    conflicted: [],
    resolved: [],
  };

  for (const path of new Set([...rowsBefore.keys(), ...rowsAfter.keys()])) {
    const was = rowsBefore.get(path);
    const now = rowsAfter.get(path);

    const fileBefore = was?.worktree.present ? was.worktree.oid : null;
    const fileAfter = now?.worktree.present ? now.worktree.oid : null;
    if (fileBefore !== fileAfter) {
      if (fileBefore === null) groups.created.push(path);
      else if (fileAfter === null) groups.removed.push(path);
      else groups.edited.push(path);
    }

    if (!was?.conflicted && now?.conflicted) groups.conflicted.push(path);
    else if (was?.conflicted && now && !now.conflicted) groups.resolved.push(path);
    else if (now && !now.conflicted && !headMoved) {
      const stagedBefore = was?.index.tone === 'staged';
      const stagedAfter = now.index.tone === 'staged';
      const indexChanged = was?.index.oid !== now.index.oid || was?.index.present !== now.index.present;
      if (stagedAfter && indexChanged) groups.staged.push(path);
      else if (stagedBefore && !stagedAfter) groups.unstaged.push(path);
    }
  }

  if (headMoved && groups.created.length + groups.edited.length + groups.removed.length > 0) {
    const total = groups.created.length + groups.edited.length + groups.removed.length;
    add('worktree', `The working directory was updated to match: ${plural(total, 'file')} changed on disk.`);
  } else {
    if (groups.created.length) add('worktree', `${listPaths(groups.created)} created in the working directory.`);
    if (groups.edited.length) add('worktree', `${listPaths(groups.edited)} changed in the working directory.`);
    if (groups.removed.length) add('worktree', `${listPaths(groups.removed)} removed from the working directory.`);
  }
  if (groups.staged.length) add('staged', `${listPaths(groups.staged)} staged: the content was copied into the staging area.`);
  if (groups.unstaged.length) add('staged', `${listPaths(groups.unstaged)} unstaged: the staging area matches the last commit again.`);
  if (groups.conflicted.length) add('worktree', `${listPaths(groups.conflicted)} is in conflict: both sides changed the same lines.`);
  if (groups.resolved.length) add('staged', `${listPaths(groups.resolved)} marked as resolved.`);

  /* Stash and paused operations */
  if (after.stashes.length > before.stashes.length) {
    add('stash', 'Your uncommitted changes were put on the stash shelf as `stash@{0}`.');
  } else if (after.stashes.length < before.stashes.length) {
    add('stash', 'A stash entry was taken off the shelf.');
  }
  if (before.operation !== after.operation) {
    if (after.operation) add('ref', `A ${after.operation} is paused and waiting for you.`);
    else if (before.operation) add('ref', `The ${before.operation} is no longer in progress.`);
  }

  if (effects.length === 0) add('none', 'Nothing changed. This command only reads.');
  return effects;
}
