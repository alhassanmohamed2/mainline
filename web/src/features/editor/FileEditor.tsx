import type { FileDiff } from '@mainline/shared';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { api, ApiFailure } from '../../api/client.ts';
import { Button } from '../../components/Button.tsx';
import { Dialog } from '../../components/Dialog.tsx';
import { plural } from '../../lib/format.ts';
import { saveFile } from '../../services/files.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { countConflicts, resolveConflicts, type Resolution } from './conflict.ts';
import { DiffView } from './DiffView.tsx';
import styles from './FileEditor.module.css';

type Load = { state: 'loading' } | { state: 'ready' } | { state: 'unreadable'; reason: string };

/** Edits a real file in the playground. Saving writes it to disk. */
export function FileEditor({ path, fresh, initialTab = 'edit' }: { path: string; fresh: boolean; initialTab?: 'edit' | 'changes' }) {
  const close = useUiStore((state) => state.closeEditor);
  const [load, setLoad] = useState<Load>(fresh ? { state: 'ready' } : { state: 'loading' });
  const [original, setOriginal] = useState('');
  const [text, setText] = useState('');
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [view, setView] = useState<'edit' | 'changes'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fresh) return;
    let cancelled = false;
    Promise.all([api.readFile(path), api.readDiff(path)])
      .then(([file, changes]) => {
        if (cancelled) return;
        setDiff(changes);
        if (file.binary) setLoad({ state: 'unreadable', reason: 'This is a binary file, so it cannot be edited as text.' });
        else if (file.tooLarge) setLoad({ state: 'unreadable', reason: 'This file is too large to edit here.' });
        else {
          setOriginal(file.content);
          setText(file.content);
          setLoad({ state: 'ready' });
        }
      })
      .catch((failure: unknown) => {
        if (!cancelled) setLoad({ state: 'unreadable', reason: failure instanceof ApiFailure ? failure.message : 'The file could not be read.' });
      });
    return () => {
      cancelled = true;
    };
  }, [path, fresh]);

  const conflicts = countConflicts(text);
  const dirty = fresh || text !== original;
  const hasChanges = Boolean(diff && (diff.unstaged || diff.staged));

  const save = async () => {
    if (saving || load.state !== 'ready') return;
    setSaving(true);
    const problem = await saveFile(path, text);
    setSaving(false);
    if (problem) setError(problem);
    else close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
  };

  const resolve = (keep: Resolution) => setText(resolveConflicts(text, keep));

  return (
    <Dialog
      title={fresh ? `New file: ${path}` : path}
      width="wide"
      onClose={close}
      actions={
        <>
          <span className={styles.shortcut}>Ctrl/⌘ + S saves</span>
          <Button onClick={close}>Cancel</Button>
          <Button variant="signal" icon="check" busy={saving} disabled={saving || load.state !== 'ready' || !dirty} onClick={save}>
            Save to disk
          </Button>
        </>
      }
    >
      {!fresh ? (
        <div className={styles.views} role="tablist" aria-label="File views">
          <button type="button" role="tab" aria-selected={view === 'edit'} onClick={() => setView('edit')}>
            Working copy
          </button>
          <button type="button" role="tab" aria-selected={view === 'changes'} onClick={() => setView('changes')}>
            Changes{hasChanges ? ' •' : ''}
          </button>
        </div>
      ) : null}

      {load.state === 'loading' ? <p className={styles.message}>Reading the file…</p> : null}
      {load.state === 'unreadable' ? <p className={styles.message}>{load.reason}</p> : null}

      {load.state === 'ready' && view === 'edit' ? (
        <>
          {conflicts > 0 ? (
            <div className={styles.conflict} role="status">
              <p>
                <strong>{plural(conflicts, 'conflict')} in this file.</strong> The lines between{' '}
                <code>{'<<<<<<<'}</code> and <code>=======</code> are yours (HEAD); the lines down to{' '}
                <code>{'>>>>>>>'}</code> are incoming. Edit by hand, or let Mainline remove the markers:
              </p>
              <div className={styles.conflictButtons}>
                <Button size="small" variant="ink" onClick={() => resolve('both')}>
                  Keep both
                </Button>
                <Button size="small" onClick={() => resolve('ours')}>
                  Keep mine (HEAD)
                </Button>
                <Button size="small" onClick={() => resolve('theirs')}>
                  Keep incoming
                </Button>
              </div>
            </div>
          ) : null}
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label={`Content of ${path}`}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
            placeholder="Type the content of the file…"
          />
          <p className={styles.footnote}>
            Saving changes the file in your working directory only. Git notices the difference, but nothing is staged or
            committed until you run <code>git add</code> and <code>git commit</code>.
          </p>
        </>
      ) : null}

      {load.state === 'ready' && view === 'changes' && diff ? (
        <div className={styles.diffs}>
          <DiffView
            title="Not staged yet"
            caption="working directory compared with the staging area (git diff)"
            text={diff.unstaged}
            empty="No unstaged changes in this file."
          />
          <DiffView
            title="Staged"
            caption="staging area compared with the last commit (git diff --staged)"
            text={diff.staged}
            empty="Nothing staged for this file."
          />
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </Dialog>
  );
}
