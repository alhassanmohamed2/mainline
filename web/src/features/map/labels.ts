import type { RepoSnapshot } from '@mainline/shared';

export interface RefLabel {
  kind: 'head' | 'branch' | 'remote' | 'tag';
  name: string;
  /** For a branch: HEAD is attached to it. */
  current: boolean;
}

/** Every name that points at a commit, grouped by the commit it points at. */
export function labelsByCommit(snapshot: RepoSnapshot): Map<string, RefLabel[]> {
  const labels = new Map<string, RefLabel[]>();
  const add = (sha: string, label: RefLabel) => labels.set(sha, [...(labels.get(sha) ?? []), label]);

  const { head } = snapshot;
  if (head?.kind === 'detached') add(head.sha, { kind: 'head', name: 'HEAD', current: true });

  const currentBranch = head?.kind === 'branch' ? head.branch : null;
  // The branch HEAD is on comes first, with HEAD in front of it.
  for (const branch of [...snapshot.branches].sort((a, b) => Number(b.name === currentBranch) - Number(a.name === currentBranch))) {
    if (branch.name === currentBranch) add(branch.sha, { kind: 'head', name: 'HEAD', current: true });
    add(branch.sha, { kind: 'branch', name: branch.name, current: branch.name === currentBranch });
  }
  for (const remote of snapshot.remoteBranches) add(remote.sha, { kind: 'remote', name: remote.name, current: false });
  for (const tag of snapshot.tags) add(tag.sha, { kind: 'tag', name: tag.name, current: false });
  return labels;
}
