import type { RepoSnapshot } from '@mainline/shared';

/**
 * Git compares three trees. The board shows them side by side, one row per
 * file, so a difference between two neighbouring columns is a change waiting
 * to be staged or committed.
 */

export type CellTone =
  /** Nothing here. */
  | 'none'
  /** Identical to the column on its right. */
  | 'clean'
  /** Differs from the staging area: an unstaged change. */
  | 'wd'
  /** Differs from the last commit: a staged change. */
  | 'staged'
  | 'conflict'
  | 'ignored'
  /** A file in a folder that is not a repository yet. */
  | 'plain';

export interface Cell {
  present: boolean;
  oid: string | null;
  /** State word, in git's own vocabulary. null when there is nothing to say. */
  label: string | null;
  tone: CellTone;
}

export interface FileRow {
  path: string;
  worktree: Cell;
  index: Cell;
  head: Cell;
  changed: boolean;
  ignored: boolean;
  conflicted: boolean;
}

const ABSENT: Cell = { present: false, oid: null, label: null, tone: 'none' };

export function buildFileRows(snapshot: RepoSnapshot): FileRow[] {
  const worktree = new Map(snapshot.worktree.map((file) => [file.path, file]));
  const head = new Map(snapshot.headTree.map((entry) => [entry.path, entry.oid]));
  const index = new Map<string, string>();
  const conflicted = new Set<string>();
  for (const entry of snapshot.index) {
    if (entry.stage === 0) index.set(entry.path, entry.oid);
    else conflicted.add(entry.path);
  }

  const paths = new Set([...worktree.keys(), ...index.keys(), ...conflicted, ...head.keys()]);

  const rows = [...paths].map((path): FileRow => {
    const file = worktree.get(path);
    const indexOid = index.get(path) ?? null;
    const headOid = head.get(path) ?? null;
    const inConflict = conflicted.has(path);
    const ignored = Boolean(file?.ignored) && indexOid === null && !inConflict;

    let worktreeCell: Cell = ABSENT;
    if (file) {
      const base = { present: true, oid: file.oid };
      if (!snapshot.exists) worktreeCell = { ...base, label: 'plain file', tone: 'plain' };
      else if (ignored) worktreeCell = { ...base, label: 'ignored', tone: 'ignored' };
      else if (inConflict) worktreeCell = { ...base, label: 'conflict', tone: 'conflict' };
      else if (indexOid === null) worktreeCell = { ...base, label: 'untracked', tone: 'wd' };
      else if (file.oid !== indexOid) worktreeCell = { ...base, label: 'modified', tone: 'wd' };
      else worktreeCell = { ...base, label: null, tone: 'clean' };
    } else if (indexOid !== null) {
      worktreeCell = { present: false, oid: null, label: 'deleted', tone: 'wd' };
    }

    let indexCell: Cell = ABSENT;
    if (inConflict) indexCell = { present: true, oid: null, label: 'unmerged', tone: 'conflict' };
    else if (indexOid !== null) {
      const base = { present: true, oid: indexOid };
      if (headOid === null) indexCell = { ...base, label: 'new file', tone: 'staged' };
      else if (indexOid !== headOid) indexCell = { ...base, label: 'modified', tone: 'staged' };
      else indexCell = { ...base, label: null, tone: 'clean' };
    } else if (headOid !== null) {
      indexCell = { present: false, oid: null, label: 'deleted', tone: 'staged' };
    }

    const headCell: Cell = headOid === null ? ABSENT : { present: true, oid: headOid, label: null, tone: 'clean' };

    return {
      path,
      worktree: worktreeCell,
      index: indexCell,
      head: headCell,
      changed: ['wd', 'conflict'].includes(worktreeCell.tone) || ['staged', 'conflict'].includes(indexCell.tone),
      ignored,
      conflicted: inConflict,
    };
  });

  return rows.sort((a, b) => Number(a.ignored) - Number(b.ignored) || a.path.localeCompare(b.path));
}
