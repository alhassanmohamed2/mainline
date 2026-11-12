import { fillTemplate, type RunAction } from '@mainline/curriculum';
import { useEffect, useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { commandParts } from '../../lib/commandParts.ts';
import { runCommand } from '../../services/commands.ts';
import { templateValues } from '../../services/session.ts';
import { useLessonStore } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Lesson.module.css';

interface RunActionCardProps {
  action: RunAction;
  actionId: string;
  /** This is the next thing to do in the step. */
  isNext: boolean;
  /** Exit code of the last run; undefined when it has not been run. */
  exitCode: number | undefined;
}

export function RunActionCard({ action, actionId, isNext, exitCode }: RunActionCardProps) {
  const system = useRepoStore((state) => state.system);
  const snapshot = useRepoStore((state) => state.snapshot);
  const running = useTerminalStore((state) => state.running);
  const markDone = useLessonStore((state) => state.markDone);
  const setPane = useUiStore((state) => state.setPane);
  const setTerminalDraft = useUiStore((state) => state.setTerminalDraft);
  const [explained, setExplained] = useState(isNext);
  const [copied, setCopied] = useState(false);

  useEffect(() => setExplained(isNext), [isNext]);

  const values = templateValues(system, snapshot);
  const command = fillTemplate(action.run, values);
  const fill = (text: string) => fillTemplate(text, values);
  const ran = exitCode !== undefined;
  const asExpected = ran && (exitCode !== 0) === Boolean(action.failsOnPurpose);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const sendToPrompt = () => {
    setPane('stage');
    setTerminalDraft(command);
  };

  const run = async () => {
    setPane('stage');
    const outcome = await runCommand(command, 'lesson');
    if (outcome.ran) markDone(actionId, outcome.exitCode ?? 1);
  };

  return (
    <div className={styles.action} data-next={isNext || undefined} data-ran={ran || undefined}>
      <div className={styles.commandRow}>
        <code className={styles.command} title={command}>
          <span className={styles.dollar} aria-hidden="true">
            $
          </span>
          {commandParts(command).map((part, index) => (
            <span key={index} data-kind={part.kind}>
              {part.text}{' '}
            </span>
          ))}
        </code>
        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={copy}
            title={copied ? 'Copied to clipboard!' : 'Copy command to clipboard'}
            aria-label={copied ? 'Copied!' : 'Copy command'}
          >
            <Icon name={copied ? 'check' : 'copy'} size={12} />
            {copied ? <span className={styles.miniFeedback}>Copied!</span> : null}
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            onClick={sendToPrompt}
            title="Put command in terminal to edit or inspect"
            aria-label="Send to terminal prompt"
          >
            <Icon name="terminal" size={12} />
          </button>
          <Button
            size="small"
            variant={isNext ? 'signal' : 'quiet'}
            icon="play"
            disabled={running}
            onClick={run}
            aria-label={`Run: ${command}`}
          >
            {ran ? 'Again' : 'Run'}
          </Button>
        </div>
      </div>

      {action.changesRemote ? (
        <p className={styles.remoteNote}>
          <Icon name="warning" size={13} /> Changes GitHub for real. You will be asked to confirm.
        </p>
      ) : null}

      {ran ? (
        <p className={styles.result} data-ok={asExpected}>
          {asExpected ? <Icon name="check" size={13} /> : <Icon name="warning" size={13} />}
          {action.failsOnPurpose
            ? exitCode !== 0
              ? `Failed with exit code ${exitCode}, as intended.`
              : 'This was meant to fail but succeeded: your sandbox is in a different state than the lesson assumes.'
            : exitCode === 0
              ? 'Ran. Exit code 0.'
              : `Exit code ${exitCode}. Read the output in the terminal; if the sandbox has drifted, rebuild the starting point above.`}
        </p>
      ) : null}

      <button type="button" className={styles.explainToggle} aria-expanded={explained} onClick={() => setExplained(!explained)}>
        <span className={styles.chevron} data-open={explained || undefined}>
          <Icon name="chevron" size={12} />
        </span>
        What each part means
      </button>
      {explained ? (
        <dl className={styles.anatomy}>
          {action.anatomy.map((piece, index) => (
            <div key={index} className={styles.anatomyRow}>
              <dt>
                <code>{fill(piece.part)}</code>
              </dt>
              <dd>{fill(piece.note)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
