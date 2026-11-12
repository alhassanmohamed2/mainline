import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { shortSha } from '../../lib/format.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import styles from './Board.module.css';

/** The fourth place content can be: a remote. Shows how far apart local and remote are. */
export function RemoteStrip() {
  const snapshot = useRepoStore((state) => state.snapshot);
  const remote = snapshot?.remotes.find((entry) => entry.name === 'origin') ?? snapshot?.remotes[0];
  if (!snapshot || !remote) return null;

  const branchName = snapshot.head && snapshot.head.kind !== 'detached' ? snapshot.head.branch : null;
  const branch = snapshot.branches.find((entry) => entry.name === branchName);
  const upstream = branch?.upstream ? snapshot.remoteBranches.find((entry) => entry.name === branch.upstream) : undefined;
  const pushedAnything = snapshot.remoteBranches.some((entry) => entry.name.startsWith(`${remote.name}/`));

  let status: string;
  if (!branch) status = 'HEAD is detached, so there is no branch to compare.';
  else if (branch.upstreamGone) status = `${branch.upstream} no longer exists on the remote.`;
  else if (!branch.upstream) {
    status = pushedAnything
      ? `${branch.name} is not on the remote yet. Push it with: git push -u ${remote.name} ${branch.name}`
      : `Nothing has been pushed yet. Push with: git push -u ${remote.name} ${branch.name}`;
  } else if (branch.ahead === 0 && branch.behind === 0) status = 'In sync as of the last fetch or push.';
  else status = '';

  return (
    <div className={styles.remote}>
      <div className={styles.remoteHead}>
        <Plate>Remote</Plate>
        <strong className={styles.remoteName}>{remote.name}</strong>
        {remote.github ? (
          <a className={styles.remoteLink} href={remote.github.webUrl} target="_blank" rel="noreferrer">
            github.com/{remote.github.owner}/{remote.github.repo} <Icon name="external" size={12} />
          </a>
        ) : (
          <code className={styles.remoteUrl}>{remote.url}</code>
        )}
      </div>

      {branch?.upstream && !branch.upstreamGone ? (
        <div className={styles.track} data-synced={(branch.ahead === 0 && branch.behind === 0) || undefined}>
          <span className={styles.end}>
            <strong>{branch.name}</strong> <code>{shortSha(branch.sha)}</code>
          </span>
          <span className={styles.gap}>
            <span data-active={branch.ahead > 0 || undefined}>
              <Icon name="arrowRight" size={13} /> {branch.ahead} to push
            </span>
            <span data-active={branch.behind > 0 || undefined}>
              <Icon name="arrowLeft" size={13} /> {branch.behind} to pull
            </span>
          </span>
          <span className={styles.end}>
            <strong>{branch.upstream}</strong> <code>{shortSha(upstream?.sha)}</code>
          </span>
        </div>
      ) : null}
      {status ? <p className={styles.remoteStatus}>{status}</p> : null}
    </div>
  );
}
