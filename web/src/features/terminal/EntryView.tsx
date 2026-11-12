import { memo, useMemo, useState } from 'react';
import { parseAnsi } from '../../lib/ansi.ts';
import { duration, plural } from '../../lib/format.ts';
import type { TerminalEntry } from '../../state/terminalStore.ts';
import styles from './Terminal.module.css';

const IMPACT_NOTE = {
  local: null,
  'network-read': 'contacted the remote',
  'remote-write': 'changed the remote',
} as const;

/** One command and everything it printed. */
export const EntryView = memo(function EntryView({ entry }: { entry: TerminalEntry }) {
  const spans = useMemo(() => parseAnsi(entry.output), [entry.output]);
  const [showSetup, setShowSetup] = useState(false);
  const [folder, where] = entry.prompt.split(' ');

  if (entry.setupLog) {
    const failed = entry.setupLog.find((line) => !line.ok);
    return (
      <div className={styles.entry}>
        <p className={styles.setup}>
          <span className={styles.setupMark}>↻</span> {entry.command}
          {entry.setupLog.length > 0 ? (
            <button type="button" className={styles.setupToggle} aria-expanded={showSetup} onClick={() => setShowSetup(!showSetup)}>
              {showSetup ? 'hide' : 'show'} the {plural(entry.setupLog.length, 'command')} that ran
            </button>
          ) : null}
        </p>
        {showSetup || failed ? (
          <ol className={styles.setupLog}>
            {entry.setupLog.map((line, index) => (
              <li key={index} data-ok={line.ok}>
                <span aria-hidden="true">{line.ok ? '✓' : '✗'}</span> {line.command}
                {!line.ok && line.output ? <pre className={styles.output}>{line.output}</pre> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }

  const impactNote = entry.impact ? IMPACT_NOTE[entry.impact] : null;
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedOut, setCopiedOut] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(entry.command);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1500);
    } catch {
      // ignore
    }
  };

  const copyOutput = async () => {
    if (!entry.output) return;
    try {
      await navigator.clipboard.writeText(entry.output);
      setCopiedOut(true);
      setTimeout(() => setCopiedOut(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.entry} data-status={entry.status}>
      <div className={styles.entryHeader}>
        <p className={styles.commandLine}>
          <span className={styles.folder}>{folder}</span>
          {where ? <span className={styles.where}> {where}</span> : null}
          <span className={styles.sign}> $ </span>
          <span className={styles.typed}>{entry.command}</span>
        </p>

        <div className={styles.entryActions}>
          <button
            type="button"
            className={styles.entryActionBtn}
            onClick={copyCommand}
            title={copiedCmd ? 'Command copied!' : 'Copy command'}
            aria-label="Copy command"
          >
            {copiedCmd ? '✓ Copied' : 'Copy'}
          </button>
          {entry.output ? (
            <button
              type="button"
              className={styles.entryActionBtn}
              onClick={copyOutput}
              title={copiedOut ? 'Output copied!' : 'Copy output'}
              aria-label="Copy output"
            >
              {copiedOut ? '✓ Output' : 'Output'}
            </button>
          ) : null}
        </div>
      </div>

      {entry.output ? (
        <pre className={styles.output}>
          {spans.map((span, index) => (
            <span
              key={index}
              style={{
                color: span.color,
                fontWeight: span.bold ? 600 : undefined,
                opacity: span.dim ? 0.65 : undefined,
                fontStyle: span.italic ? 'italic' : undefined,
                textDecoration: span.underline ? 'underline' : undefined,
              }}
            >
              {span.text}
            </span>
          ))}
        </pre>
      ) : null}

      {entry.note ? (
        <p className={styles.note}>
          {entry.note.reason}
          {entry.note.hint ? <span className={styles.hint}> {entry.note.hint}</span> : null}
        </p>
      ) : null}

      {entry.status === 'running' ? (
        <p className={styles.meta}>
          <span className={styles.spinner} aria-hidden="true" /> running
        </p>
      ) : entry.status === 'done' ? (
        <p className={styles.meta}>
          <span className={styles.exit} data-ok={entry.exitCode === 0}>
            exit {entry.exitCode ?? '?'}
          </span>
          {entry.durationMs !== null ? <span>{duration(entry.durationMs)}</span> : null}
          {impactNote ? <span className={styles.impact}>{impactNote}</span> : null}
          {entry.output === '' ? <span>no output</span> : null}
        </p>
      ) : null}
    </div>
  );
});
