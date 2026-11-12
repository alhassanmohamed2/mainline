import { motion } from 'motion/react';
import { memo, type MouseEvent } from 'react';
import { Icon } from '../../components/Icon.tsx';
import { shortSha } from '../../lib/format.ts';
import { runCommand } from '../../services/commands.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Board.module.css';
import type { Cell, FileRow } from './fileRows.ts';

interface TicketProps {
  cell: Cell;
  /** -1: content arrived from the column on the left, 1: from the right, 0: changed in place. */
  from: -1 | 0 | 1;
  animate: boolean;
  /** How this column compares with the one on its left. */
  versus?: 'same' | 'differs' | null;
  column: string;
}

/** One file in one tree: its state in git's words, and the id of its content. */
function Ticket({ cell, from, animate, versus, column }: TicketProps) {
  // Remount (and so re-animate) only when the content itself changes.
  const identity = cell.present ? (cell.oid ?? 'unhashed') : (cell.label ?? 'absent');
  const description = cell.present
    ? `${column}: ${cell.label ?? 'unchanged'}${cell.oid ? `, content id ${shortSha(cell.oid)}` : ''}`
    : `${column}: ${cell.label ?? 'not present'}`;

  const tooltip = cell.present
    ? `${column}: ${cell.label ?? 'unchanged'}${cell.oid ? `\nBlob hash: ${cell.oid}` : ''}`
    : `${column}: not present in this tree`;

  return (
    <div className={styles.cell} role="cell" aria-label={description}>
      {versus ? (
        <span className={styles.versus} data-versus={versus} aria-hidden="true">
          {versus === 'same' ? '=' : '≠'}
        </span>
      ) : null}
      <motion.div
        key={identity}
        className={styles.ticket}
        data-tone={cell.tone}
        data-present={cell.present || undefined}
        title={tooltip}
        initial={animate ? { x: from * 34, opacity: 0, scale: from === 0 ? 0.9 : 1 } : false}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {cell.label ? <span className={styles.state}>{cell.label}</span> : null}
        {cell.oid ? <code className={styles.oid}>{shortSha(cell.oid)}</code> : null}
        {!cell.label && !cell.oid ? <span className={styles.none}>not here</span> : null}
      </motion.div>
    </div>
  );
}

const compare = (left: Cell, right: Cell): 'same' | 'differs' | null => {
  if (left.tone === 'ignored' || left.tone === 'plain') return null;
  if (!left.present && !right.present && !left.label && !right.label) return null;
  return left.present === right.present && left.oid === right.oid && left.tone !== 'conflict' && right.tone !== 'conflict'
    ? 'same'
    : 'differs';
};

interface FileRowViewProps {
  row: FileRow;
  animate: boolean;
  onOpen: () => void;
}

export const FileRowView = memo(function FileRowView({ row, animate, onOpen }: FileRowViewProps) {
  const { worktree, index, head } = row;
  const openEditor = useUiStore((state) => state.openEditor);
  const same = (a: Cell, b: Cell) => a.present && b.present && a.oid !== null && a.oid === b.oid;

  const stageFile = (e: MouseEvent) => {
    e.stopPropagation();
    void runCommand(`git add "${row.path}"`, 'typed');
  };

  const unstageFile = (e: MouseEvent) => {
    e.stopPropagation();
    void runCommand(`git restore --staged "${row.path}"`, 'typed');
  };

  const viewDiff = (e: MouseEvent) => {
    e.stopPropagation();
    openEditor(row.path, false, 'changes');
  };

  return (
    <div className={styles.row} role="row" data-ignored={row.ignored || undefined}>
      <div role="rowheader" className={styles.file}>
        <div className={styles.fileHeaderGroup}>
          <button type="button" className={styles.fileButton} onClick={onOpen} title={`Open ${row.path} in the editor`}>
            <span className={styles.fileName}>{row.path}</span>
            <span className={styles.fileEdit}>
              <Icon name="pencil" size={13} />
            </span>
          </button>
          <div className={styles.rowActions}>
            {row.changed ? (
              <button
                type="button"
                className={styles.rowActionBtn}
                onClick={viewDiff}
                title={`View diff for ${row.path}`}
                aria-label={`Diff ${row.path}`}
              >
                Diff
              </button>
            ) : null}
            {row.worktree.tone === 'wd' ? (
              <button
                type="button"
                className={styles.rowActionBtn}
                data-action="stage"
                onClick={stageFile}
                title={`Stage ${row.path} (git add)`}
                aria-label={`Stage ${row.path}`}
              >
                +Stage
              </button>
            ) : null}
            {row.index.tone === 'staged' ? (
              <button
                type="button"
                className={styles.rowActionBtn}
                data-action="unstage"
                onClick={unstageFile}
                title={`Unstage ${row.path} (git restore --staged)`}
                aria-label={`Unstage ${row.path}`}
              >
                -Unstage
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <Ticket column="Working directory" cell={worktree} animate={animate} from={same(worktree, index) ? 1 : 0} />
      <Ticket
        column="Staging area"
        cell={index}
        animate={animate}
        versus={compare(worktree, index)}
        from={same(index, worktree) ? -1 : same(index, head) ? 1 : 0}
      />
      <Ticket
        column="Last commit"
        cell={head}
        animate={animate}
        versus={compare(index, head)}
        from={same(head, index) ? -1 : 0}
      />
    </div>
  );
});
