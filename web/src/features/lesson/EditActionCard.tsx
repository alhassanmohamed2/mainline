import type { EditAction } from '@mainline/curriculum';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { saveFile } from '../../services/files.ts';
import { useLessonStore } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Lesson.module.css';

interface EditActionCardProps {
  action: EditAction;
  actionId: string;
  isNext: boolean;
  exitCode: number | undefined;
}

/** A step the learner does by hand in the editor (or lets Mainline do). */
export function EditActionCard({ action, actionId, isNext, exitCode }: EditActionCardProps) {
  const openEditor = useUiStore((state) => state.openEditor);
  const markDone = useLessonStore((state) => state.markDone);
  const running = useTerminalStore((state) => state.running);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = exitCode !== undefined;

  // The step counts as done once the file's content changes after the editor was opened from here.
  const watchedOid = useRef<string | null | undefined>(undefined);
  const currentOid = useRepoStore(
    (state) => state.snapshot?.worktree.find((file) => file.path === action.file)?.oid ?? null,
  );
  useEffect(() => {
    if (watchedOid.current !== undefined && watchedOid.current !== currentOid) {
      watchedOid.current = undefined;
      markDone(actionId, 0);
    }
  }, [currentOid, actionId, markDone]);

  const edit = () => {
    watchedOid.current = currentOid;
    openEditor(action.file);
  };

  const solve = async () => {
    setBusy(true);
    const problem = await saveFile(action.file, action.solution);
    setBusy(false);
    setError(problem);
    if (!problem) markDone(actionId, 0);
  };

  return (
    <div className={styles.action} data-next={isNext || undefined} data-ran={done || undefined}>
      <div className={styles.commandRow}>
        <p className={styles.editTitle}>
          <Icon name="pencil" size={14} /> Edit <code>{action.file}</code>
        </p>
      </div>
      <p className={styles.editGoal}>{action.goal}</p>
      <div className={styles.editButtons}>
        <Button size="small" variant={isNext ? 'signal' : 'quiet'} icon="pencil" onClick={edit}>
          Open the editor
        </Button>
        <Button size="small" busy={busy} disabled={busy || running} onClick={solve}>
          Do it for me
        </Button>
      </div>
      {done ? (
        <p className={styles.result} data-ok="true">
          <Icon name="check" size={13} /> File saved.
        </p>
      ) : null}
      {error ? (
        <p className={styles.result} data-ok="false">
          <Icon name="warning" size={13} /> {error}
        </p>
      ) : null}
    </div>
  );
}
