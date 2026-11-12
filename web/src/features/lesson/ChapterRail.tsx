import { chapters } from '@mainline/curriculum';
import type { CSSProperties } from 'react';
import { actionKey, useLessonStore } from '../../state/lessonStore.ts';
import styles from './Lesson.module.css';

/** The eight chapters as route bullets on one line. */
export function ChapterRail() {
  const chapterId = useLessonStore((state) => state.chapterId);
  const done = useLessonStore((state) => state.done);
  const openChapter = useLessonStore((state) => state.openChapter);

  return (
    <nav className={styles.rail} aria-label="Chapters">
      <ol className={styles.railList}>
        {chapters.map((chapter) => {
          const finishedSteps = chapter.steps.filter((step) =>
            step.actions.length > 0 && step.actions.every((_, index) => actionKey(chapter.id, step.id, index) in done),
          ).length;
          const finished = finishedSteps === chapter.steps.length;
          const current = chapter.id === chapterId;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={styles.bullet}
                style={{ '--bullet': `var(--line-${chapter.color})` } as CSSProperties}
                data-current={current || undefined}
                data-finished={finished || undefined}
                aria-current={current ? 'step' : undefined}
                aria-label={`Chapter ${chapter.number}: ${chapter.title}${finished ? ' (finished)' : ` (${finishedSteps}/${chapter.steps.length})`}`}
                title={`Line ${chapter.number}: ${chapter.title} • ${finishedSteps}/${chapter.steps.length} stations`}
                onClick={() => openChapter(chapter.id)}
              >
                {chapter.number}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
