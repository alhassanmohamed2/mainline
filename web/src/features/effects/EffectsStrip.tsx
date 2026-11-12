import { Plate } from '../../components/Plate.tsx';
import { inline } from '../../lib/inline.tsx';
import { useRepoStore } from '../../state/repoStore.ts';
import styles from './EffectsStrip.module.css';

/** Says, in words, what the last command did to the repository. */
export function EffectsStrip() {
  const effects = useRepoStore((state) => state.effects);
  const cause = useRepoStore((state) => state.effectsCause);
  const takenAt = useRepoStore((state) => state.snapshot?.takenAt);

  return (
    <section className={styles.strip} aria-label="What the last command changed" aria-live="polite">
      <div className={styles.head}>
        <Plate tone="signal">What changed</Plate>
        {cause ? <code className={styles.cause}>{cause}</code> : null}
      </div>
      {cause ? (
        <ul key={takenAt} className={styles.list}>
          {effects.map((effect, index) => (
            <li key={index} data-kind={effect.kind}>
              {inline(effect.text)}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.idle}>
          Run a command. Mainline compares the repository before and after, and lists every difference here.
        </p>
      )}
    </section>
  );
}
