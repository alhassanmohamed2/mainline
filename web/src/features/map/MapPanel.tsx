import { GitHubPanel } from '../github/GitHubPanel.tsx';
import { Internals } from '../internals/Internals.tsx';
import { useUiStore, type RightTab } from '../../state/uiStore.ts';
import { LineMap } from './LineMap.tsx';
import styles from './MapPanel.module.css';

const TABS: { id: RightTab; label: string }[] = [
  { id: 'map', label: 'Line map' },
  { id: 'internals', label: 'Under the hood' },
  { id: 'github', label: 'GitHub' },
];

/** The right-hand column: three views of the same repository. */
export function MapPanel() {
  const tab = useUiStore((state) => state.rightTab);
  const setTab = useUiStore((state) => state.setRightTab);
  const openPullRequests = useUiStore((state) =>
    state.github?.connected && state.github.ok ? state.github.pullRequests.filter((pr) => pr.state === 'OPEN').length : 0,
  );

  return (
    <section className={styles.panel} aria-label="Repository views">
      <div className={styles.tabs} role="tablist" aria-label="Repository views">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            className={styles.tab}
            onClick={() => setTab(id)}
          >
            {label}
            {id === 'github' && openPullRequests > 0 ? <span className={styles.count}>{openPullRequests}</span> : null}
          </button>
        ))}
      </div>
      <div className={styles.body} role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'map' ? <LineMap /> : tab === 'internals' ? <Internals /> : <GitHubPanel />}
      </div>
    </section>
  );
}
