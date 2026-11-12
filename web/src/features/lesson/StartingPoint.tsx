import type { Chapter } from '@mainline/curriculum';
import { Button } from '../../components/Button.tsx';
import { inline } from '../../lib/inline.tsx';
import { useLessonStore } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Lesson.module.css';
import { checkStartingPoint } from './startingPoint.ts';

/** Says where the chapter starts and offers to put the sandbox there. */
export function StartingPoint({ chapter }: { chapter: Chapter }) {
  const snapshot = useRepoStore((state) => state.snapshot);
  const system = useRepoStore((state) => state.system);
  const started = useLessonStore((state) => Object.keys(state.done).some((key) => key.startsWith(`${chapter.id}/`)));
  const openChapter = useLessonStore((state) => state.openChapter);
  const openResetDialog = useUiStore((state) => state.openResetDialog);

  // Once the learner is under way, the sandbox is expected to have moved on.
  const check = started ? { status: 'ok' as const, message: null } : checkStartingPoint(chapter, snapshot, system);
  const origin = snapshot?.remotes.find((remote) => remote.github)?.github;

  return (
    <div className={styles.start} data-status={check.status}>
      <p className={styles.startLabel}>Starts from</p>
      <p>{inline(chapter.startingPoint)}</p>
      {check.message ? <p className={styles.startProblem}>{inline(check.message)}</p> : null}
      {chapter.needs && check.status === 'ok' && system?.gh.user ? (
        <p className={styles.startFine}>
          Logged in to GitHub as <strong>{system.gh.user}</strong>
          {origin ? (
            <>
              , connected to <strong>{origin.owner}/{origin.repo}</strong>
            </>
          ) : null}
          .
        </p>
      ) : null}
      <div className={styles.startActions}>
        {chapter.setup ? (
          <Button
            size="small"
            variant={check.status === 'rebuild' ? 'signal' : 'quiet'}
            icon="refresh"
            onClick={() => openResetDialog(chapter.id)}
          >
            {check.status === 'rebuild' ? 'Set up the sandbox for this chapter' : 'Rebuild this starting point'}
          </Button>
        ) : (
          <Button size="small" icon="arrowLeft" onClick={() => openChapter('github')}>
            Go to chapter 7
          </Button>
        )}
      </div>
    </div>
  );
}
