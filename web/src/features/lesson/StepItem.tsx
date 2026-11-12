import { chapters, type Chapter, type Step } from '@mainline/curriculum';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { inline } from '../../lib/inline.tsx';
import { actionKey, useLessonStore } from '../../state/lessonStore.ts';
import { EditActionCard } from './EditActionCard.tsx';
import styles from './Lesson.module.css';
import { RunActionCard } from './RunActionCard.tsx';

interface StepItemProps {
  chapter: Chapter;
  step: Step;
  index: number;
  active: boolean;
  complete: boolean;
  last: boolean;
}

/** One station on the chapter's line. The active one is expanded. */
export function StepItem({ chapter, step, index, active, complete, last }: StepItemProps) {
  const done = useLessonStore((state) => state.done);
  const openStep = useLessonStore((state) => state.openStep);
  const openChapter = useLessonStore((state) => state.openChapter);
  const element = useRef<HTMLLIElement>(null);
  const mounted = useRef(false);

  // Bring a newly opened station into view (but not on the first paint).
  useEffect(() => {
    if (active && mounted.current) element.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    mounted.current = true;
  }, [active]);

  const nextAction = step.actions.findIndex((_, actionIndex) => !(actionKey(chapter.id, step.id, actionIndex) in done));
  const previous = chapter.steps[index - 1];
  const following = chapter.steps[index + 1];
  const nextChapter = chapters[chapter.number];

  return (
    <li
      ref={element}
      className={styles.step}
      data-state={active ? 'active' : complete ? 'done' : 'todo'}
      data-last={last || undefined}
    >
      <button type="button" className={styles.stepHead} aria-expanded={active} onClick={() => openStep(step.id)}>
        <span className={styles.station} aria-hidden="true">
          {complete ? <Icon name="check" size={15} /> : index + 1}
        </span>
        <span className={styles.stepTitle}>{step.title}</span>
        <span className={styles.stepIndexBadge}>
          {index + 1}/{chapter.steps.length}
        </span>
        {complete ? <span className="visually-hidden">(done)</span> : null}
      </button>

      {active ? (
        <div className={styles.stepBody}>
          {step.body.map((paragraph, i) => (
            <p key={i}>{inline(paragraph)}</p>
          ))}

          <ol className={styles.actions}>
            {step.actions.map((action, actionIndex) => {
              const key = actionKey(chapter.id, step.id, actionIndex);
              const props = { actionId: key, isNext: actionIndex === nextAction, exitCode: done[key] };
              return (
                <li key={key}>
                  {action.kind === 'run' ? (
                    <RunActionCard action={action} {...props} />
                  ) : (
                    <EditActionCard action={action} {...props} />
                  )}
                </li>
              );
            })}
          </ol>

          <div className={styles.notice}>
            <Plate tone="outline">Look for</Plate>
            <ul>
              {step.notice.map((item, i) => (
                <li key={i}>{inline(item)}</li>
              ))}
            </ul>
          </div>

          {step.term ? (
            <aside className={styles.term}>
              <p className={styles.termName}>{step.term.name}</p>
              <p>{inline(step.term.text)}</p>
            </aside>
          ) : null}

          <div className={styles.stepNav}>
            {previous ? (
              <Button
                size="small"
                variant="quiet"
                icon="arrowUp"
                onClick={() => openStep(previous.id)}
                aria-label={`Previous: ${previous.title}`}
              >
                Previous
              </Button>
            ) : null}
            {following ? (
              <Button
                variant={complete ? 'signal' : 'quiet'}
                icon="arrowDown"
                onClick={() => openStep(following.id)}
              >
                Next: {following.title}
              </Button>
            ) : nextChapter && complete ? (
              <Button
                variant="signal"
                icon="arrowRight"
                onClick={() => openChapter(nextChapter.id)}
              >
                Continue to Line {nextChapter.number}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
