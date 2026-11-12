import type { RepoSnapshot } from './snapshot.ts';

/** How far a command's effects reach. */
export type Impact =
  /** Only touches the playground folder on this machine. */
  | 'local'
  /** Talks to a remote but only downloads / reads. */
  | 'network-read'
  /** Changes something on a remote (GitHub) for real. */
  | 'remote-write';

export interface RunRequest {
  command: string;
  /** Set after the user approved a `confirm` event for this exact command. */
  confirmed?: boolean;
}

/** POST /api/run answers with one JSON object per line, in this order. */
export type RunEvent =
  | { type: 'start'; program: string; impact: Impact }
  | { type: 'output'; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'exit'; code: number | null; durationMs: number; timedOut: boolean }
  /** The command was not run at all. */
  | { type: 'rejected'; reason: string; hint?: string }
  /** The command was not run yet: it changes a remote and needs a yes. */
  | { type: 'confirm'; title: string; details: string[]; danger: boolean }
  | { type: 'snapshot'; snapshot: RepoSnapshot };

export interface SystemInfo {
  platform: string;
  git: { version: string } | null;
  gh: {
    installed: boolean;
    version: string | null;
    loggedIn: boolean;
    user: string | null;
  };
  sandbox: {
    /** Absolute path of the playground folder on disk. */
    path: string;
    /** Folder name shown in the prompt. */
    dirName: string;
    /** Suggested GitHub repository name for this sandbox generation. */
    repoName: string;
  };
}

export interface FileContent {
  path: string;
  exists: boolean;
  binary: boolean;
  tooLarge: boolean;
  content: string;
}

export interface FileDiff {
  path: string;
  unstaged: string;
  staged: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface ResetRequest {
  /** Rebuild the starting state of this chapter; omit for an empty folder. */
  chapterId?: string;
}

export interface SetupLogLine {
  command: string;
  ok: boolean;
  output: string;
}

export interface ResetResponse {
  snapshot: RepoSnapshot;
  system: SystemInfo;
  log: SetupLogLine[];
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  headRefName: string;
  baseRefName: string;
  url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  url: string;
}

export type GitHubState =
  | { connected: false }
  | { connected: true; ok: false; nameWithOwner: string; url: string; error: string }
  | {
      connected: true;
      ok: true;
      nameWithOwner: string;
      url: string;
      visibility: string;
      defaultBranch: string | null;
      pullRequests: GitHubPullRequest[];
      issues: GitHubIssue[];
    };

export interface ApiError {
  error: string;
}
