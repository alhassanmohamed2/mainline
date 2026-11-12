import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { plural, relativeTime, shortSha } from '../../lib/format.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { CommitDetails } from './CommitDetails.tsx';
import { labelsByCommit, type RefLabel } from './labels.ts';
import { edgePath, layoutMap, pickMainTip } from './layout.ts';
import styles from './LineMap.module.css';

const LANE_WIDTH = 22;
const PADDING = 20;
const ROW_PLAIN = 50;
const ROW_LABELLED = 72;

const LANE_COLORS = [
  'var(--ink)',
  'var(--line-blue)',
  'var(--line-orange)',
  'var(--line-purple)',
  'var(--line-teal)',
  'var(--line-pink)',
  'var(--line-green)',
];
const laneColor = (lane: number) => (lane === 0 ? LANE_COLORS[0]! : LANE_COLORS[1 + ((lane - 1) % (LANE_COLORS.length - 1))]!);

function Label({ label }: { label: RefLabel }) {
  return (
    <motion.span
      layoutId={`ref-${label.kind}-${label.name}`}
      layout="position"
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={styles.label}
      data-kind={label.kind}
      data-current={label.current || undefined}
    >
      {label.name}
    </motion.span>
  );
}

/** The commit graph, drawn as a transit map: commits are stations, branches are lines. */
export function LineMap() {
  const snapshot = useRepoStore((state) => state.snapshot);
  const showGhosts = useUiStore((state) => state.showGhosts);
  const toggleGhosts = useUiStore((state) => state.toggleGhosts);
  const selected = useUiStore((state) => state.selectedCommit);
  const selectCommit = useUiStore((state) => state.selectCommit);
  const [filter, setFilter] = useState('');

  const view = useMemo(() => {
    if (!snapshot) return null;
    const commits = showGhosts ? snapshot.commits : snapshot.commits.filter((commit) => commit.reachable);
    const layout = layoutMap(commits, pickMainTip(snapshot));
    const labels = labelsByCommit(snapshot);

    // Rows that carry labels are taller, so station positions are cumulative.
    const tops: number[] = [];
    const heights: number[] = [];
    let offset = 0;
    for (const { commit } of layout.placed) {
      const height = labels.has(commit.sha) ? ROW_LABELLED : ROW_PLAIN;
      tops.push(offset);
      heights.push(height);
      offset += height;
    }
    const x = (lane: number) => PADDING + lane * LANE_WIDTH;
    const y = (row: number) => (tops[row] ?? offset) + (heights[row] ?? ROW_PLAIN) / 2;
    return { layout, labels, heights, x, y, height: offset, width: PADDING * 2 + (layout.laneCount - 1) * LANE_WIDTH };
  }, [snapshot, showGhosts]);

  // Stations that were not on the map a moment ago arrive with a pop.
  const known = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (view && known.current) {
    for (const { commit } of view.layout.placed) if (!known.current.has(commit.sha)) fresh.add(commit.sha);
  }
  useEffect(() => {
    if (view) known.current = new Set(view.layout.placed.map(({ commit }) => commit.sha));
  }, [view]);

  if (!snapshot || !view) return null;

  const { head } = snapshot;
  const headSha = head && head.kind !== 'unborn' ? head.sha : null;
  const ghosts = snapshot.commits.filter((commit) => !commit.reachable).length;
  const selectedCommit = snapshot.commits.find((commit) => commit.sha === selected);
  const now = snapshot.takenAt;

  const q = filter.trim().toLowerCase();

  return (
    <div className={styles.map}>
      <div className={styles.status}>
        <button
          type="button"
          className={styles.chainButton}
          onClick={() => headSha && selectCommit(headSha === selected ? null : headSha)}
          title={headSha ? `Click to view HEAD commit (${shortSha(headSha)})` : undefined}
          aria-label="View HEAD commit"
        >
          <Plate tone="signal">HEAD</Plate>
          {head ? (
            <>
              <span className={styles.arrow} aria-hidden="true" />
              {head.kind !== 'detached' ? (
                <>
                  <span className={styles.chainBranch}>{head.branch}</span>
                  <span className={styles.arrow} aria-hidden="true" />
                </>
              ) : null}
              <code className={styles.chainSha}>{headSha ? shortSha(headSha) : 'no commit yet'}</code>
              {head.kind === 'detached' ? <span className={styles.detached}>detached</span> : null}
            </>
          ) : (
            <span className={styles.chainNone}>no repository</span>
          )}
        </button>
        {ghosts > 0 ? (
          <label className={styles.ghostToggle}>
            <input type="checkbox" checked={showGhosts} onChange={toggleGhosts} />
            {plural(ghosts, 'unreachable commit')}
          </label>
        ) : null}
      </div>

      {view.layout.placed.length > 3 ? (
        <div className={styles.mapSearch}>
          <Icon name="search" size={13} />
          <input
            className={styles.mapSearchInput}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter commits by message, author, or SHA..."
            aria-label="Filter commits"
            spellCheck={false}
          />
          {filter ? (
            <button type="button" className={styles.mapSearchClear} onClick={() => setFilter('')} aria-label="Clear filter">
              <Icon name="close" size={11} />
            </button>
          ) : null}
        </div>
      ) : null}

      {view.layout.placed.length === 0 ? (
        <div className={styles.empty}>
          <svg width="120" height="40" viewBox="0 0 120 40" aria-hidden="true">
            <path d="M6 20h108" stroke="var(--rule)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
            <circle cx="60" cy="20" r="9" fill="var(--card)" stroke="var(--rule)" strokeWidth="4" />
          </svg>
          <p className={styles.emptyTitle}>{snapshot.exists ? 'No stations yet' : 'No map yet'}</p>
          <p>
            {snapshot.exists
              ? 'The branch exists in name only. Your first commit becomes the first station on this line.'
              : 'Commits are drawn here as stations on a line. First the folder needs to become a repository.'}
          </p>
        </div>
      ) : (
        <div className={`${styles.scroller} scroll`}>
          <div className={styles.canvas} style={{ height: view.height }}>
            <svg className={styles.tracks} width={view.width} height={view.height} aria-hidden="true">
              {view.layout.edges.map((edge) => (
                <path
                  key={edge.key}
                  d={edgePath(edge, view.x, view.y)}
                  className={styles.edge}
                  data-ghost={edge.ghost || undefined}
                  stroke={edge.ghost ? 'var(--ghost)' : laneColor(edge.viaLane)}
                />
              ))}
              {view.layout.placed.map(({ commit, row, lane }) => {
                const cx = view.x(lane);
                const cy = view.y(row);
                const merge = commit.parents.length > 1;
                const matches = !q || commit.subject.toLowerCase().includes(q) || commit.author.toLowerCase().includes(q) || commit.sha.includes(q);
                return (
                  <g
                    key={commit.sha}
                    className={styles.station}
                    data-fresh={fresh.has(commit.sha) || undefined}
                    style={{ opacity: matches ? 1 : 0.3 }}
                  >
                    {commit.sha === headSha ? <circle cx={cx} cy={cy} r={13} className={styles.here} /> : null}
                    {!commit.reachable ? (
                      <circle cx={cx} cy={cy} r={6} className={styles.ghostNode} />
                    ) : merge ? (
                      <>
                        <circle cx={cx} cy={cy} r={8} className={styles.interchange} />
                        <circle cx={cx} cy={cy} r={3} fill={laneColor(lane)} />
                      </>
                    ) : (
                      <circle cx={cx} cy={cy} r={6.5} className={styles.node} stroke={laneColor(lane)} />
                    )}
                  </g>
                );
              })}
            </svg>

            <ol className={styles.rows} style={{ paddingLeft: view.width - 4 }}>
              {view.layout.placed.map(({ commit, row }) => {
                const labels = view.labels.get(commit.sha);
                const matches = !q || commit.subject.toLowerCase().includes(q) || commit.author.toLowerCase().includes(q) || commit.sha.includes(q);
                return (
                  <li key={commit.sha} style={{ height: view.heights[row], opacity: matches ? 1 : 0.3 }}>
                    <button
                      type="button"
                      className={styles.row}
                      data-ghost={!commit.reachable || undefined}
                      data-selected={commit.sha === selected || undefined}
                      aria-pressed={commit.sha === selected}
                      onClick={() => selectCommit(commit.sha === selected ? null : commit.sha)}
                    >
                      {labels ? (
                        <span className={styles.labels}>
                          {labels.map((label) => (
                            <Label key={`${label.kind}-${label.name}`} label={label} />
                          ))}
                        </span>
                      ) : null}
                      <span className={styles.subject}>{commit.subject}</span>
                      <span className={styles.meta}>
                        <code>{shortSha(commit.sha)}</code>
                        {commit.reachable ? (
                          <>
                            <span>{commit.author}</span>
                            <span>{relativeTime(commit.date, now)}</span>
                          </>
                        ) : (
                          <span>unreachable: only the reflog remembers it</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          {snapshot.commitsTruncated ? <p className={styles.truncated}>Older commits are not shown.</p> : null}
        </div>
      )}

      {selectedCommit ? <CommitDetails commit={selectedCommit} /> : null}
    </div>
  );
}
