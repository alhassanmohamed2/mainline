import type { Operation } from '@mainline/shared';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { plural, shortSha } from '../../lib/format.ts';
import { inline } from '../../lib/inline.tsx';
import { runCommand } from '../../services/commands.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Board.module.css';
import { FileRowView } from './FileRowView.tsx';
import { buildFileRows } from './fileRows.ts';
import { RemoteStrip } from './RemoteStrip.tsx';

const OPERATION_HELP: Record<Operation, string> = {
  merge: 'Fix the files marked as conflicts, `git add` them, then `git commit`. To back out: `git merge --abort`.',
  rebase: 'Fix the conflicts, `git add` the files, then `git rebase --continue`. To back out: `git rebase --abort`.',
  'cherry-pick': 'Fix the conflicts, `git add` the files, then `git cherry-pick --continue`. To back out: `git cherry-pick --abort`.',
  revert: 'Fix the conflicts, `git add` the files, then `git revert --continue`. To back out: `git revert --abort`.',
  bisect: 'A bisect is running. End it with `git bisect reset`.',
};

/** How many unchanged files are listed before the rest is folded away. */
const CLEAN_ROWS_SHOWN = 6;
const FOLD_ABOVE = 12;

/** The three trees, side by side: working directory, staging area, last commit. */
export function Board() {
  const snapshot = useRepoStore((state) => state.snapshot);
  const openEditor = useUiStore((state) => state.openEditor);
  const setTerminalDraft = useUiStore((state) => state.setTerminalDraft);
  const setPane = useUiStore((state) => state.setPane);
  const [expanded, setExpanded] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [filterText, setFilterText] = useState('');

  // Tickets only animate for changes that happen after the first paint.
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);

  const rows = useMemo(() => (snapshot ? buildFileRows(snapshot) : []), [snapshot]);
  if (!snapshot) return null;

  const hasUnstaged = rows.some((row) => row.worktree.tone === 'wd');
  const hasStaged = rows.some((row) => row.index.tone === 'staged');

  const filtered = filterText.trim()
    ? rows.filter((row) => row.path.toLowerCase().includes(filterText.trim().toLowerCase()))
    : rows;

  const fold = filtered.length > FOLD_ABOVE && !expanded;
  let cleanShown = 0;
  const visible = fold ? filtered.filter((row) => row.changed || (cleanShown += 1) <= CLEAN_ROWS_SHOWN) : filtered;
  const hidden = filtered.length - visible.length;

  const head = snapshot.head;
  const headCaption = !snapshot.exists
    ? 'after git init'
    : head?.kind === 'unborn'
      ? 'no commits yet'
      : `HEAD · ${shortSha(head?.sha)}`;

  const createFile = (event: FormEvent) => {
    event.preventDefault();
    const path = name.trim();
    if (!path) return;
    openEditor(path, !rows.some((row) => row.path === path && row.worktree.present));
    setNaming(false);
    setName('');
  };

  return (
    <section className={styles.board} aria-label="Files in the three trees">
      <header className={styles.top}>
        <div className={styles.titleGroup}>
          <h2 className={styles.heading}>Where every file stands</h2>
          {rows.length > 3 ? (
            <div className={styles.filterWrap}>
              <Icon name="search" size={13} />
              <input
                className={styles.filterInput}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter files..."
                aria-label="Filter files by name"
                spellCheck={false}
              />
              {filterText ? (
                <button type="button" className={styles.filterClear} onClick={() => setFilterText('')} aria-label="Clear filter">
                  <Icon name="close" size={11} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.topActions}>
          {hasUnstaged ? (
            <Button
              size="small"
              variant="signal"
              icon="plus"
              onClick={() => void runCommand('git add .', 'typed')}
              title="Stage all modified and new files (git add .)"
            >
              Stage all
            </Button>
          ) : null}
          {hasStaged ? (
            <Button
              size="small"
              variant="quiet"
              icon="minus"
              onClick={() => void runCommand('git restore --staged .', 'typed')}
              title="Unstage all staged files (git restore --staged .)"
            >
              Unstage all
            </Button>
          ) : null}

          {naming ? (
            <form className={styles.newFile} onSubmit={createFile}>
              <input
                className={styles.newFileInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setNaming(false)}
                placeholder="notes.txt"
                aria-label="Name of the new file"
                autoFocus
                spellCheck={false}
              />
              <Button size="small" variant="ink" type="submit">
                Create
              </Button>
              <Button size="small" icon="close" aria-label="Cancel" onClick={() => setNaming(false)} />
            </form>
          ) : (
            <Button size="small" icon="filePlus" onClick={() => setNaming(true)}>
              New file
            </Button>
          )}
        </div>
      </header>

      {snapshot.operation ? (
        <div className={styles.operation} role="status">
          <Plate>{snapshot.operation} in progress</Plate>
          <p>{inline(OPERATION_HELP[snapshot.operation])}</p>
        </div>
      ) : null}

      <div className={styles.table} role="table" aria-label="Files" data-repo={snapshot.exists || undefined}>
        <div className={styles.columns} role="row">
          <div role="columnheader" className={styles.fileHeader}>
            File
          </div>
          <div role="columnheader" className={styles.column}>
            <Plate>
              <span className={styles.full}>Working directory</span>
              <span className={styles.short}>Working dir</span>
            </Plate>
            <span className={styles.caption}>files on disk</span>
          </div>
          <div role="columnheader" className={styles.column} data-dim={!snapshot.exists || undefined}>
            <Plate>
              <span className={styles.full}>Staging area</span>
              <span className={styles.short}>Staging</span>
            </Plate>
            <span className={styles.caption}>{snapshot.exists ? 'your next commit' : 'after git init'}</span>
          </div>
          <div role="columnheader" className={styles.column} data-dim={!snapshot.exists || undefined}>
            <Plate>Last commit</Plate>
            <span className={styles.caption}>{headCaption}</span>
          </div>
        </div>

        {snapshot.exists ? (
          <div className={styles.flows}>
            <div className={styles.flow}>
              <button
                type="button"
                className={styles.flowAction}
                onClick={() => void runCommand('git add .', 'typed')}
                title="Click to stage all modified files: git add ."
              >
                <span className={styles.forward}>
                  git add <Icon name="arrowRight" size={13} />
                </span>
              </button>
              <button
                type="button"
                className={styles.flowAction}
                onClick={() => void runCommand('git restore .', 'typed')}
                title="Click to discard working changes: git restore ."
              >
                <span className={styles.backward}>
                  <Icon name="arrowLeft" size={13} /> git restore
                </span>
              </button>
            </div>
            <div className={styles.flow}>
              <button
                type="button"
                className={styles.flowAction}
                onClick={() => {
                  setTerminalDraft('git commit -m ""');
                  setPane('stage');
                }}
                title="Click to write commit command in terminal: git commit"
              >
                <span className={styles.forward}>
                  git commit <Icon name="arrowRight" size={13} />
                </span>
              </button>
              <button
                type="button"
                className={styles.flowAction}
                onClick={() => void runCommand('git restore --staged .', 'typed')}
                title="Click to unstage all: git restore --staged ."
              >
                <span className={styles.backward}>
                  <Icon name="arrowLeft" size={13} /> git restore --staged
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className={styles.empty}>
            {filterText
              ? `No files matching "${filterText}".`
              : snapshot.exists
                ? 'The folder is empty. Create a file with echo, or with "New file".'
                : 'An empty folder, and not a repository yet. Run git init to begin.'}
          </p>
        ) : (
          visible.map((row) => (
            <FileRowView key={row.path} row={row} animate={settled.current} onOpen={() => openEditor(row.path)} />
          ))
        )}

        {filtered.length > FOLD_ABOVE ? (
          <button type="button" className={styles.more} onClick={() => setExpanded(!expanded)}>
            {fold ? `Show ${plural(hidden, 'more unchanged file')}` : 'Show fewer files'}
          </button>
        ) : null}
        {snapshot.worktreeTruncated ? <p className={styles.empty}>Only the first files are listed.</p> : null}
      </div>

      {snapshot.stashes.length > 0 ? (
        <div className={styles.shelf}>
          <Plate tone="outline">Stash</Plate>
          <ul>
            {snapshot.stashes.map((stash) => (
              <li key={stash.ref}>
                <code>{stash.ref}</code> {stash.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <RemoteStrip />
    </section>
  );
}
