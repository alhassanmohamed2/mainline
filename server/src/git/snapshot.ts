import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  BranchRef,
  CommitNode,
  HeadState,
  IndexEntry,
  Operation,
  RemoteBranchRef,
  RepoInternals,
  RepoSnapshot,
  StashEntry,
  TagRef,
  TreeEntry,
  WorktreeFile,
} from '@mainline/shared';
import { config } from '../config.ts';
import { paths } from '../sandbox/workspace.ts';
import { git, lines, nulSeparated } from './query.ts';
import { readRemotes } from './remotes.ts';
import { listWorktree } from './worktree.ts';

const FIELD = '\x1f';
const RECORD = '\x1e';

async function readHead(): Promise<HeadState | null> {
  const [symbolic, commit] = await Promise.all([
    git(['symbolic-ref', '-q', '--short', 'HEAD']),
    git(['rev-parse', '-q', '--verify', 'HEAD^{commit}']),
  ]);
  const branch = symbolic.code === 0 ? symbolic.stdout.trim() : null;
  const sha = commit.code === 0 ? commit.stdout.trim() : null;
  if (branch && sha) return { kind: 'branch', branch, sha };
  if (branch) return { kind: 'unborn', branch };
  if (sha) return { kind: 'detached', sha };
  return null;
}

interface Refs {
  branches: BranchRef[];
  remoteBranches: RemoteBranchRef[];
  tags: TagRef[];
}

async function readRefs(): Promise<Refs> {
  const format = ['%(refname)', '%(objectname)', '%(*objectname)', '%(objecttype)', '%(upstream:short)', '%(upstream:track)'].join('%1f');
  const result = await git(['for-each-ref', `--format=${format}`]);
  const refs: Refs = { branches: [], remoteBranches: [], tags: [] };
  if (result.code !== 0) return refs;

  for (const line of lines(result.stdout)) {
    const [refname = '', oid = '', peeled = '', type = '', upstream = '', track = ''] = line.split(FIELD);
    if (refname.startsWith('refs/heads/')) {
      refs.branches.push({
        name: refname.slice('refs/heads/'.length),
        sha: oid,
        upstream: upstream || null,
        ahead: Number(/ahead (\d+)/.exec(track)?.[1] ?? 0),
        behind: Number(/behind (\d+)/.exec(track)?.[1] ?? 0),
        upstreamGone: track.includes('gone'),
      });
    } else if (refname.startsWith('refs/remotes/')) {
      const name = refname.slice('refs/remotes/'.length);
      if (!name.endsWith('/HEAD')) refs.remoteBranches.push({ name, sha: oid });
    } else if (refname.startsWith('refs/tags/')) {
      refs.tags.push({ name: refname.slice('refs/tags/'.length), sha: peeled || oid, annotated: type === 'tag' });
    }
  }
  return refs;
}

async function readCommits(head: HeadState | null, refs: Refs): Promise<{ commits: CommitNode[]; truncated: boolean }> {
  const headSha = head && head.kind !== 'unborn' ? head.sha : null;
  const hasRefs = refs.branches.length + refs.remoteBranches.length + refs.tags.length > 0;
  if (!headSha && !hasRefs) return { commits: [], truncated: false };

  const named = ['--branches', '--tags', '--remotes', ...(headSha ? ['HEAD'] : [])];

  // Commits that only the reflog still remembers are drawn as ghosts.
  const reflog = headSha ? await git(['log', '-g', '--format=%H', '-n', String(config.reflogDepth), 'HEAD']) : null;
  const reflogShas = reflog && reflog.code === 0 ? [...new Set(lines(reflog.stdout))] : [];

  const format = `--format=${['%H', '%P', '%an', '%aI', '%s'].join('%x1f')}%x1e`;
  const limit = ['-n', String(config.maxCommits + 1)];
  let [log, reachable] = await Promise.all([
    git(['log', '--date-order', format, ...limit, ...named, ...reflogShas]),
    git(['rev-list', ...named]),
  ]);
  // A reflog entry can point at an object that was already pruned.
  if (log.code !== 0) log = await git(['log', '--date-order', format, ...limit, ...named]);
  if (log.code !== 0) return { commits: [], truncated: false };

  const reachableShas = new Set(lines(reachable.stdout));
  const commits = log.stdout
    .split(RECORD)
    .map((record) => record.replace(/^\n/, ''))
    .filter(Boolean)
    .map((record): CommitNode => {
      const [sha = '', parents = '', author = '', date = '', subject = ''] = record.split(FIELD);
      return { sha, parents: parents ? parents.split(' ') : [], author, date, subject, reachable: reachableShas.has(sha) };
    });

  return { commits: commits.slice(0, config.maxCommits), truncated: commits.length > config.maxCommits };
}

async function readIndex(): Promise<IndexEntry[]> {
  const result = await git(['ls-files', '-s', '-z']);
  if (result.code !== 0) return [];
  return nulSeparated(result.stdout).map((entry) => {
    const tab = entry.indexOf('\t');
    const [, oid = '', stage = '0'] = entry.slice(0, tab).split(' ');
    return { path: entry.slice(tab + 1), oid, stage: Number(stage) };
  });
}

async function readHeadTree(head: HeadState | null): Promise<TreeEntry[]> {
  if (!head || head.kind === 'unborn') return [];
  const result = await git(['ls-tree', '-r', '-z', 'HEAD']);
  if (result.code !== 0) return [];
  return nulSeparated(result.stdout).map((entry) => {
    const tab = entry.indexOf('\t');
    const [, , oid = ''] = entry.slice(0, tab).split(' ');
    return { path: entry.slice(tab + 1), oid };
  });
}

/** Asks git what blob id each working file would get, exactly as `git add` would compute it. */
async function hashWorktree(files: string[]): Promise<(string | null)[]> {
  if (files.length === 0) return [];
  const result = await git(['hash-object', '--stdin-paths'], `${files.join('\n')}\n`);
  const oids = lines(result.stdout);
  if (result.code !== 0 || oids.length !== files.length) return files.map(() => null);
  return oids;
}

async function readIgnored(): Promise<Set<string>> {
  const result = await git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']);
  return new Set(result.code === 0 ? nulSeparated(result.stdout) : []);
}

async function readStashes(): Promise<StashEntry[]> {
  const result = await git(['stash', 'list', '--format=%gd%x1f%gs']);
  if (result.code !== 0) return [];
  return lines(result.stdout).map((line) => {
    const [ref = '', message = ''] = line.split(FIELD);
    return { ref, message };
  });
}

async function readOperation(): Promise<Operation | null> {
  const gitDir = path.join(paths.repoDir, '.git');
  const present = async (name: string) => {
    try {
      await fs.access(path.join(gitDir, name));
      return true;
    } catch {
      return false;
    }
  };
  const [merge, rebaseMerge, rebaseApply, cherryPick, revert, bisect] = await Promise.all(
    ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG'].map(present),
  );
  if (rebaseMerge || rebaseApply) return 'rebase';
  if (merge) return 'merge';
  if (cherryPick) return 'cherry-pick';
  if (revert) return 'revert';
  if (bisect) return 'bisect';
  return null;
}

async function readInternals(): Promise<RepoInternals> {
  const [headFile, counts] = await Promise.all([
    fs.readFile(path.join(paths.repoDir, '.git', 'HEAD'), 'utf8').then(
      (text) => text.trim(),
      () => null,
    ),
    git(['count-objects', '-v']),
  ]);
  const count = (label: string) => Number(new RegExp(`^${label}: (\\d+)`, 'm').exec(counts.stdout)?.[1] ?? 0);
  return { headFile, looseObjects: count('count'), packedObjects: count('in-pack') };
}

/** Reads the complete, current state of the playground repository. */
export async function takeSnapshot(): Promise<RepoSnapshot> {
  const [listing, inside] = await Promise.all([listWorktree(), git(['rev-parse', '--is-inside-work-tree'])]);
  const exists = inside.code === 0 && inside.stdout.trim() === 'true';

  if (!exists) {
    const oids = await hashWorktree(listing.files);
    return {
      takenAt: Date.now(),
      exists: false,
      head: null,
      branches: [],
      remoteBranches: [],
      tags: [],
      commits: [],
      commitsTruncated: false,
      worktree: listing.files.map((file, i) => ({ path: file, oid: oids[i] ?? null, ignored: false })),
      worktreeTruncated: listing.truncated,
      index: [],
      headTree: [],
      stashes: [],
      remotes: [],
      operation: null,
      internals: { headFile: null, looseObjects: 0, packedObjects: 0 },
    };
  }

  const [head, refs] = await Promise.all([readHead(), readRefs()]);
  const [history, index, headTree, oids, ignored, stashes, remotes, operation, internals] = await Promise.all([
    readCommits(head, refs),
    readIndex(),
    readHeadTree(head),
    hashWorktree(listing.files),
    readIgnored(),
    readStashes(),
    readRemotes(),
    readOperation(),
    readInternals(),
  ]);

  const worktree: WorktreeFile[] = listing.files.map((file, i) => ({
    path: file,
    oid: oids[i] ?? null,
    ignored: ignored.has(file),
  }));

  return {
    takenAt: Date.now(),
    exists: true,
    head,
    ...refs,
    commits: history.commits,
    commitsTruncated: history.truncated,
    worktree,
    worktreeTruncated: listing.truncated,
    index,
    headTree,
    stashes,
    remotes,
    operation,
    internals,
  };
}
