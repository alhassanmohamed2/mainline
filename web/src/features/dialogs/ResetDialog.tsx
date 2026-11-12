import { chapters } from '@mainline/curriculum';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Dialog } from '../../components/Dialog.tsx';
import { resetSandbox } from '../../services/sandbox.ts';
import { useChapter } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Dialogs.module.css';

/** Confirms wiping the playground, optionally rebuilding a chapter's starting state. */
export function ResetDialog({ chapterId }: { chapterId: string | null }) {
  const close = useUiStore((state) => state.closeResetDialog);
  const system = useRepoStore((state) => state.system);
  const snapshot = useRepoStore((state) => state.snapshot);
  const running = useTerminalStore((state) => state.running);
  const current = useChapter();
  const [busy, setBusy] = useState<'empty' | 'chapter' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened from a chapter: rebuild that one. Opened from the top bar: offer the current chapter.
  const chapter = chapters.find((entry) => entry.id === (chapterId ?? current.id));
  const rebuildable = chapter?.setup ? chapter : null;
  const remote = snapshot?.remotes.find((entry) => entry.github)?.github;

  const reset = async (target: 'empty' | 'chapter') => {
    setBusy(target);
    const problem = await resetSandbox(target === 'chapter' && rebuildable ? rebuildable.id : null);
    setBusy(null);
    if (problem) setError(problem);
    else close();
  };

  return (
    <Dialog
      title="Start the sandbox over?"
      onClose={close}
      actions={
        <>
          <Button onClick={close} disabled={busy !== null}>
            Cancel
          </Button>
          <Button variant={rebuildable ? 'quiet' : 'ink'} busy={busy === 'empty'} disabled={busy !== null || running} onClick={() => reset('empty')}>
            Empty folder
          </Button>
          {rebuildable ? (
            <Button variant="signal" icon="refresh" busy={busy === 'chapter'} disabled={busy !== null || running} onClick={() => reset('chapter')}>
              Set up chapter {rebuildable.number}
            </Button>
          ) : null}
        </>
      }
    >
      <p>
        Everything in the playground folder is deleted, including its <code className="prose-code">.git</code> folder.
        Nothing outside it is touched.
      </p>
      <pre className={styles.command}>{system?.sandbox.path}</pre>
      {rebuildable ? (
        <p>
          <strong>Set up chapter {rebuildable.number}</strong> then replays {rebuildable.setup?.length ?? 0} real commands to
          recreate where "{rebuildable.title}" starts. <strong>Empty folder</strong> leaves it blank, as chapter 1 expects.
        </p>
      ) : null}
      {remote ? (
        <p className={styles.warning}>
          The repository <strong>{remote.owner}/{remote.repo}</strong> on GitHub is not deleted by this. The last step of
          chapter 8 shows how to remove it.
        </p>
      ) : null}
      {running ? <p className={styles.warning}>A command is still running. Wait for it to finish first.</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </Dialog>
  );
}
