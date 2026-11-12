import { chapters } from '@mainline/curriculum';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Button } from '../../components/Button.tsx';
import { inline } from '../../lib/inline.tsx';
import { actionKey, useChapter, useLessonStore } from '../../state/lessonStore.ts';
import { ChapterRail } from './ChapterRail.tsx';
import styles from './Lesson.module.css';
import { StartingPoint } from './StartingPoint.tsx';
import { StepItem } from './StepItem.tsx';

export function LessonPanel() {
  const chapter = useChapter();
  const stepId = useLessonStore((state) => state.stepId);
  const done = useLessonStore((state) => state.done);
  const openChapter = useLessonStore((state) => state.openChapter);
  const scroller = useRef<HTMLDivElement>(null);

  // A new chapter starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [chapter.id]);

  const isStepDone = (index: number) => {
    const step = chapter.steps[index]!;
    return step.actions.every((_, actionIndex) => actionKey(chapter.id, step.id, actionIndex) in done);
  };
  const chapterDone = chapter.steps.every((_, index) => isStepDone(index));
  const next = chapters[chapter.number];

  return (
    <section
      className={styles.panel}
      style={{ '--line': `var(--line-${chapter.color})` } as CSSProperties}
      aria-label="Lesson"
    >
      <ChapterRail />
      <div ref={scroller} className={`${styles.scroller} scroll`}>
        <header className={styles.header}>
          <p className={styles.kicker}>
            <span className={styles.kickerLine} aria-hidden="true" />
            Line {chapter.number} of {chapters.length}
          </p>
          <h1 className={styles.title}>{chapter.title}</h1>
          <p className={styles.intro}>{inline(chapter.intro)}</p>
          <StartingPoint chapter={chapter} />
        </header>

        <ol className={styles.steps}>
          {chapter.steps.map((step, index) => (
            <StepItem
              key={step.id}
              chapter={chapter}
              step={step}
              index={index}
              active={step.id === stepId}
              complete={isStepDone(index)}
              last={index === chapter.steps.length - 1}
            />
          ))}
        </ol>

        {chapterDone ? (
          <footer className={styles.terminus}>
            <p className={styles.terminusTitle}>End of the line.</p>
            <p>
              {next
                ? `You finished "${chapter.title}". Next: ${next.title.toLowerCase()}.`
                : 'You finished every chapter. The terminal is yours: try anything.'}
            </p>
            {next ? (
              <Button variant="signal" icon="arrowRight" onClick={() => openChapter(next.id)}>
                Continue to line {next.number}
              </Button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </section>
  );
}
