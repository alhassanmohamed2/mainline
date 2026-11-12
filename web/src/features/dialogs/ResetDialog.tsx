import { chapters } from '@mainline/curriculum';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Dialog } from '../../components/Dialog.tsx';
import { resetSandbox } from '../../services/sandbox.ts';
import { useChapter, useLessonStore } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Dialogs.module.css';

/** Confirms wiping the playground, optionally rebuilding a chapter's starting state or resetting all progress. */
export function ResetDialog({ chapterId }: { chapterId: string | null }) {
  const close = useUiStore((state) => state.closeResetDialog);
  const system = useRepoStore((state) => state.system);
  const snapshot = useRepoStore((state) => state.snapshot);
  const running = useTerminalStore((state) => state.running);
  const clearTerminal = useTerminalStore((state) => state.clear);
  const resetAllProgress = useLessonStore((state) => state.resetAllProgress);
  const current = useChapter();
  const [busy, setBusy] = useState<'empty' | 'chapter' | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened from a chapter: rebuild that one. Opened from the top bar: offer the current chapter.
  const chapter = chapters.find((entry) => entry.id === (chapterId ?? current.id));
  const rebuildable = chapter?.setup ? chapter : null;
  const remote = snapshot?.remotes.find((entry) => entry.github)?.github;

  const reset = async (target: 'empty' | 'chapter' | 'all') => {
    setBusy(target);
    setError(null);

    if (target === 'all') {
      const problem = await resetSandbox(null);
      setBusy(null);
      if (problem) {
        setError(problem);
      } else {
        resetAllProgress();
        clearTerminal();
        close();
      }
      return;
    }

    const problem = await resetSandbox(target === 'chapter' && rebuildable ? rebuildable.id : null);
    setBusy(null);
    if (problem) {
      setError(problem);
    } else {
      close();
    }
  };

  return (
    <Dialog
      title="Reset Sandbox & Progress"
      onClose={close}
      width="medium"
      actions={
        <Button onClick={close} disabled={busy !== null}>
          Cancel
        </Button>
      }
    >
      <p>
        Select how you would like to reset your playground in{' '}
        <code className="prose-code">{system?.sandbox.dirName ?? 'playground'}</code>.
      </p>

      <div className={styles.cardOptions}>
        <div className={styles.optionCard} data-featured="true">
          <div className={styles.optionInfo}>
            <div className={styles.optionTitle}>Start over from the beginning</div>
            <p className={styles.optionDesc}>
              Wipes the playground folder completely, resets curriculum progress to 0%, and returns to Chapter 1, Station 1.
            </p>
          </div>
          <Button
            variant="signal"
            icon="refresh"
            busy={busy === 'all'}
            disabled={busy !== null || running}
            onClick={() => void reset('all')}
          >
            Reset all progress
          </Button>
        </div>

        {rebuildable ? (
          <div className={styles.optionCard}>
            <div className={styles.optionInfo}>
              <div className={styles.optionTitle}>Rebuild Chapter {rebuildable.number} starting point</div>
              <p className={styles.optionDesc}>
                Cleans the sandbox and automatically runs {rebuildable.setup?.length ?? 0} commands to restore the starting state for "{rebuildable.title}".
              </p>
            </div>
            <Button
              variant="ink"
              busy={busy === 'chapter'}
              disabled={busy !== null || running}
              onClick={() => void reset('chapter')}
            >
              Set up chapter {rebuildable.number}
            </Button>
          </div>
        ) : null}

        <div className={styles.optionCard}>
          <div className={styles.optionInfo}>
            <div className={styles.optionTitle}>Empty sandbox folder only</div>
            <p className={styles.optionDesc}>
              Deletes all files and .git inside the playground folder without resetting your checked station progress.
            </p>
          </div>
          <Button
            variant="quiet"
            busy={busy === 'empty'}
            disabled={busy !== null || running}
            onClick={() => void reset('empty')}
          >
            Empty folder
          </Button>
        </div>
      </div>

      {remote ? (
        <p className={styles.warning}>
          Note: The repository <strong>{remote.owner}/{remote.repo}</strong> on GitHub is not deleted by local resets. The last step of
          Chapter 8 shows how to remove it using <code className="prose-code">gh repo delete</code>.
        </p>
      ) : null}

      {running ? <p className={styles.warning}>A command is currently running in the terminal. Wait for it to finish first.</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </Dialog>
  );
}
