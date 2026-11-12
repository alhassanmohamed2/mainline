import { Plate } from '../../components/Plate.tsx';
import { shortSha } from '../../lib/format.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './Internals.module.css';

/** What is physically inside .git right now. */
export function Internals() {
  const snapshot = useRepoStore((state) => state.snapshot);
  const selectCommit = useUiStore((state) => state.selectCommit);
  const setRightTab = useUiStore((state) => state.setRightTab);
  if (!snapshot) return null;

  if (!snapshot.exists) {
    return (
      <div className={`${styles.internals} scroll`}>
        <p className={styles.lead}>
          There is no <code className="prose-code">.git</code> folder yet, so there is nothing under the hood. Run{' '}
          <code className="prose-code">git init</code> and this tab fills in.
        </p>
      </div>
    );
  }

  const { head, internals } = snapshot;
  const refs = [
    ...snapshot.branches.map((branch) => ({ name: `refs/heads/${branch.name}`, sha: branch.sha })),
    ...snapshot.remoteBranches.map((branch) => ({ name: `refs/remotes/${branch.name}`, sha: branch.sha })),
    ...snapshot.tags.map((tag) => ({ name: `refs/tags/${tag.name}`, sha: tag.sha })),
  ];
  const headSha = head && head.kind !== 'unborn' ? head.sha : null;

  const navigateToCommit = (sha: string) => {
    selectCommit(sha);
    setRightTab('map');
  };

  return (
    <div className={`${styles.internals} scroll`}>
      <section className={styles.section}>
        <Plate>.git/HEAD</Plate>
        <pre className={styles.file}>{internals.headFile ?? '(unreadable)'}</pre>
        <p className={styles.note}>
          {head?.kind === 'detached'
            ? 'A raw commit id: HEAD is detached. Commits made now would not move any branch.'
            : 'One line of text. It names the branch you are on; git follows it to find your current commit.'}
        </p>
        <ol className={styles.chain}>
          <li>
            <span>HEAD</span>
          </li>
          {head && head.kind !== 'detached' ? (
            <li>
              <span>refs/heads/{head.branch}</span>
            </li>
          ) : null}
          <li>
            <span>{headSha ? `commit ${shortSha(headSha)}` : 'nothing yet'}</span>
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <Plate>Refs</Plate>
        <p className={styles.note}>Every branch and tag is a name stored with one commit id. Click any ref to view its station on the Line Map.</p>
        {refs.length === 0 ? (
          <p className={styles.none}>No refs yet. The first commit creates the first one.</p>
        ) : (
          <table className={styles.refs}>
            <tbody>
              {refs.map((ref) => (
                <tr
                  key={ref.name}
                  className={styles.interactiveRow}
                  onClick={() => navigateToCommit(ref.sha)}
                  title={`Click to view commit ${shortSha(ref.sha)} on the Line Map`}
                >
                  <th scope="row">{ref.name}</th>
                  <td>{shortSha(ref.sha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <Plate>Object database</Plate>
        <div className={styles.counts}>
          <div>
            <strong>{internals.looseObjects}</strong>
            <span>loose objects</span>
          </div>
          <div>
            <strong>{internals.packedObjects}</strong>
            <span>packed objects</span>
          </div>
        </div>
        <div className={styles.objectGrid}>
          <div className={styles.objectCard}>
            <span className={styles.objectCardTitle}>Blobs</span>
            <span className={styles.objectCardDesc}>File content at a point in time (compressed)</span>
          </div>
          <div className={styles.objectCard}>
            <span className={styles.objectCardTitle}>Trees</span>
            <span className={styles.objectCardDesc}>Directories mapping file names to blobs</span>
          </div>
          <div className={styles.objectCard}>
            <span className={styles.objectCardTitle}>Commits</span>
            <span className={styles.objectCardDesc}>Snapshot with author, message & parent SHA</span>
          </div>
          <div className={styles.objectCard}>
            <span className={styles.objectCardTitle}>Tags</span>
            <span className={styles.objectCardDesc}>Permanent milestone pointers with notes</span>
          </div>
        </div>
        <p className={styles.note}>
          Blobs, trees, commits and tags in <code className="prose-code">.git/objects</code>. Staging a file and committing
          both add objects. Nothing here is ever edited; undoing only changes which objects the refs point at.
        </p>
      </section>

      {snapshot.stashes.length > 0 ? (
        <section className={styles.section}>
          <Plate>refs/stash</Plate>
          <table className={styles.refs}>
            <tbody>
              {snapshot.stashes.map((stash) => (
                <tr key={stash.ref}>
                  <th scope="row">{stash.ref}</th>
                  <td className={styles.stashMessage}>{stash.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
