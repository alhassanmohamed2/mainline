import styles from './FileEditor.module.css';

const kindOf = (line: string): string => {
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) return 'header';
  if (line.startsWith('+')) return 'added';
  if (line.startsWith('-')) return 'removed';
  return 'context';
};

interface DiffViewProps {
  title: string;
  caption: string;
  text: string;
  empty: string;
}

/** A unified diff with added and removed lines coloured. */
export function DiffView({ title, caption, text, empty }: DiffViewProps) {
  const lines = text ? text.replace(/\n$/, '').split('\n') : [];
  return (
    <section className={styles.diff}>
      <h3 className={styles.diffTitle}>
        {title} <span>{caption}</span>
      </h3>
      {lines.length === 0 ? (
        <p className={styles.message}>{empty}</p>
      ) : (
        <pre className={styles.diffBody}>
          {lines.map((line, index) => (
            <span key={index} data-kind={kindOf(line)}>
              {line || ' '}
              {'\n'}
            </span>
          ))}
        </pre>
      )}
    </section>
  );
}
