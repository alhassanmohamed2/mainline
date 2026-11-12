import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { refreshGitHub } from '../../services/session.ts';
import { useLessonStore } from '../../state/lessonStore.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './GitHubPanel.module.css';

/** What GitHub itself reports about the repository behind the remote, fetched with gh. */
export function GitHubPanel() {
  const system = useRepoStore((state) => state.system);
  const github = useUiStore((state) => state.github);
  const loading = useUiStore((state) => state.githubLoading);
  const openChapter = useLessonStore((state) => state.openChapter);

  if (!system) return null;

  if (!system.gh.installed || !system.gh.loggedIn) {
    return (
      <div className={`${styles.panel} scroll`}>
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>
            {system.gh.installed ? 'gh is not logged in' : 'The GitHub CLI is not installed'}
          </p>
          <p>
            {system.gh.installed
              ? 'Run "gh auth login" once in your own terminal and follow the prompts. Then reload this page.'
              : 'The local chapters work without it. For the GitHub chapters, install gh (the README has the steps for your system), run "gh auth login", then reload this page.'}
          </p>
        </div>
      </div>
    );
  }

  if (!github || !github.connected) {
    return (
      <div className={`${styles.panel} scroll`}>
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>Not connected to GitHub yet</p>
          <p>
            You are logged in as <strong>{system.gh.user ?? 'your account'}</strong>, but the playground has no GitHub remote.
            Chapter 7 creates a private repository and connects it.
          </p>
          <Button size="small" variant="ink" icon="arrowRight" onClick={() => openChapter('github')}>
            Open chapter 7
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} scroll`} aria-busy={loading}>
      <div className={styles.repo}>
        <div className={styles.repoHead}>
          <Plate>Repository</Plate>
          {github.ok ? <Plate tone="outline">{github.visibility.toLowerCase()}</Plate> : null}
          <Button size="small" icon="refresh" busy={loading} aria-label="Refresh from GitHub" onClick={() => void refreshGitHub()} />
        </div>
        <a className={styles.repoName} href={github.url} target="_blank" rel="noreferrer">
          {github.nameWithOwner} <Icon name="external" size={14} />
        </a>
        {github.ok && github.defaultBranch ? (
          <p className={styles.sub}>
            Default branch: <code>{github.defaultBranch}</code>
          </p>
        ) : null}
        {!github.ok ? <p className={styles.error}>{github.error}</p> : null}
      </div>

      {github.ok ? (
        <>
          <section className={styles.section}>
            <h3 className={styles.heading}>
              Pull requests <span>{github.pullRequests.length}</span>
            </h3>
            {github.pullRequests.length === 0 ? (
              <p className={styles.none}>None yet. Chapter 8 opens one.</p>
            ) : (
              <ul className={styles.items}>
                {github.pullRequests.map((pr) => (
                  <li key={pr.number}>
                    <a className={styles.item} href={pr.url} target="_blank" rel="noreferrer" data-state={pr.state}>
                      <span className={styles.state}>{pr.isDraft && pr.state === 'OPEN' ? 'draft' : pr.state.toLowerCase()}</span>
                      <span className={styles.itemTitle}>
                        <span className={styles.number}>#{pr.number}</span> {pr.title}
                      </span>
                      <span className={styles.flow}>
                        <code>{pr.headRefName}</code>
                        <Icon name="arrowRight" size={12} />
                        <code>{pr.baseRefName}</code>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.heading}>
              Issues <span>{github.issues.length}</span>
            </h3>
            {github.issues.length === 0 ? (
              <p className={styles.none}>None yet.</p>
            ) : (
              <ul className={styles.items}>
                {github.issues.map((issue) => (
                  <li key={issue.number}>
                    <a className={styles.item} href={issue.url} target="_blank" rel="noreferrer" data-state={issue.state}>
                      <span className={styles.state}>{issue.state.toLowerCase()}</span>
                      <span className={styles.itemTitle}>
                        <span className={styles.number}>#{issue.number}</span> {issue.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
