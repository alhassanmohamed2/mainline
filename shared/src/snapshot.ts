/**
 * A snapshot is everything the UI draws, read straight from the real
 * repository with git plumbing commands after every command that runs.
 */

export type HeadState =
  /** A fresh repository: HEAD names a branch that has no commit yet. */
  | { kind: 'unborn'; branch: string }
  | { kind: 'branch'; branch: string; sha: string }
  /** HEAD points directly at a commit instead of a branch. */
  | { kind: 'detached'; sha: string };

export interface BranchRef {
  name: string;
  sha: string;
  /** Short name of the remote-tracking branch, e.g. "origin/main". */
  upstream: string | null;
  ahead: number;
  behind: number;
  /** The upstream is configured but no longer exists on the remote. */
  upstreamGone: boolean;
}

export interface RemoteBranchRef {
  /** e.g. "origin/main" */
  name: string;
  sha: string;
}

export interface TagRef {
  name: string;
  /** The commit the tag ultimately points at. */
  sha: string;
  annotated: boolean;
}

export interface CommitNode {
  sha: string;
  parents: string[];
  subject: string;
  author: string;
  /** ISO 8601 author date. */
  date: string;
  /** False when no branch, tag or HEAD leads here — only the reflog remembers it. */
  reachable: boolean;
}

export interface WorktreeFile {
  path: string;
  /** Blob id this content would get if added; null when it could not be hashed. */
  oid: string | null;
  ignored: boolean;
}

export interface IndexEntry {
  path: string;
  oid: string;
  /** 0 normally; 1 (base), 2 (ours), 3 (theirs) while a path is in conflict. */
  stage: number;
}

export interface TreeEntry {
  path: string;
  oid: string;
}

export interface StashEntry {
  ref: string;
  message: string;
}

export interface GitHubRemote {
  owner: string;
  repo: string;
  webUrl: string;
}

export interface RemoteInfo {
  name: string;
  url: string;
  github: GitHubRemote | null;
}

export type Operation = 'merge' | 'rebase' | 'cherry-pick' | 'revert' | 'bisect';

export interface RepoInternals {
  /** Literal content of .git/HEAD. */
  headFile: string | null;
  looseObjects: number;
  packedObjects: number;
}

export interface RepoSnapshot {
  takenAt: number;
  /** Whether the playground folder is a git repository yet. */
  exists: boolean;
  head: HeadState | null;
  branches: BranchRef[];
  remoteBranches: RemoteBranchRef[];
  tags: TagRef[];
  /** Newest first, children always before their parents. */
  commits: CommitNode[];
  commitsTruncated: boolean;
  /** The three trees git compares: working directory, index, last commit. */
  worktree: WorktreeFile[];
  worktreeTruncated: boolean;
  index: IndexEntry[];
  headTree: TreeEntry[];
  stashes: StashEntry[];
  remotes: RemoteInfo[];
  operation: Operation | null;
  internals: RepoInternals;
}
