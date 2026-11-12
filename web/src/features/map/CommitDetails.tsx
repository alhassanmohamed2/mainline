import type { CommitNode } from '@mainline/shared';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { shortSha } from '../../lib/format.ts';
import { runCommand } from '../../services/commands.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './LineMap.module.css';

const describeParents = (count: number) =>
  count === 0 ? 'No parent: the first commit' : count === 1 ? 'Parent' : `${count} parents: a merge`;

/** Details of the station the learner clicked, with real commands to inspect it. */
export function CommitDetails({ commit }: { commit: CommitNode }) {
  const selectCommit = useUiStore((state) => state.selectCommit);
  const setPane = useUiStore((state) => state.setPane);
  const running = useTerminalStore((state) => state.running);
  const [copiedSha, setCopiedSha] = useState(false);
  const short = shortSha(commit.sha);

  const run = (command: string) => {
    setPane('stage');
    void runCommand(command, 'typed');
  };

  const copySha = async () => {
    try {
      await navigator.clipboard.writeText(commit.sha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <aside className={styles.details} aria-label={`Commit ${short}`}>
      <div className={styles.detailsHead}>
        <Plate tone={commit.reachable ? 'ink' : 'outline'}>{commit.reachable ? 'Commit' : 'Unreachable commit'}</Plate>
        <Button size="small" icon="close" aria-label="Close commit details" onClick={() => selectCommit(null)} />
      </div>
      <p className={styles.detailsSubject}>{commit.subject}</p>
      <div className={styles.shaRow}>
        <code className={styles.fullSha}>{commit.sha}</code>
        <button
          type="button"
          className={styles.copyShaBtn}
          onClick={copySha}
          title={copiedSha ? 'SHA copied!' : 'Copy full SHA'}
          aria-label="Copy SHA"
        >
          <Icon name={copiedSha ? 'check' : 'copy'} size={12} />
          <span>{copiedSha ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Author</dt>
          <dd>{commit.author}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{new Date(commit.date).toLocaleString()}</dd>
        </div>
        <div>
          <dt>{describeParents(commit.parents.length)}</dt>
          <dd className={styles.parents}>
            {commit.parents.map((parent) => (
              <button key={parent} type="button" className={styles.parent} onClick={() => selectCommit(parent)}>
                {shortSha(parent)}
              </button>
            ))}
          </dd>
        </div>
      </dl>
      {!commit.reachable ? (
        <p className={styles.ghostNote}>
          No branch or tag leads here any more. The commit is intact, and giving it a name makes it reachable again.
        </p>
      ) : null}
      <div className={styles.detailsActions}>
        <Button size="small" variant="ink" icon="play" disabled={running} onClick={() => run(`git show ${short}`)}>
          git show {short}
        </Button>
        <Button size="small" icon="play" disabled={running} onClick={() => run(`git checkout ${short}`)} title={`Switch to commit ${short}`}>
          checkout
        </Button>
        {!commit.reachable ? (
          <Button size="small" icon="play" disabled={running} onClick={() => run(`git branch rescue-${short} ${short}`)}>
            rescue branch
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
