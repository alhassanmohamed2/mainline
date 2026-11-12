import type { CommitNode, RepoSnapshot } from '@mainline/shared';

/**
 * Lays the commit graph out like a transit map. Newest commit on top.
 *
 * Track 0 is reserved for the main line: the tip of the main branch and its
 * first-parent ancestors. Every other line of work gets its own track and
 * bends into the main line where it forked or merged.
 */

export interface PlacedCommit {
  commit: CommitNode;
  row: number;
  lane: number;
}

export interface MapEdge {
  key: string;
  fromRow: number;
  fromLane: number;
  /** The track the line runs along between the two stations. */
  viaLane: number;
  toRow: number;
  toLane: number;
  /** Either end is a commit no branch reaches any more. */
  ghost: boolean;
}

export interface MapLayout {
  placed: PlacedCommit[];
  edges: MapEdge[];
  laneCount: number;
}

/** The commit whose history is drawn as the main line. */
export function pickMainTip(snapshot: RepoSnapshot): string | null {
  const byName = (name: string) => snapshot.branches.find((branch) => branch.name === name)?.sha;
  const current = snapshot.head?.kind === 'branch' ? snapshot.head.sha : undefined;
  const detached = snapshot.head?.kind === 'detached' ? snapshot.head.sha : undefined;
  return byName('main') ?? byName('master') ?? current ?? snapshot.branches[0]?.sha ?? detached ?? null;
}

export function layoutMap(commits: CommitNode[], mainTip: string | null): MapLayout {
  const bySha = new Map(commits.map((commit) => [commit.sha, commit]));

  const mainline = new Set<string>();
  for (let sha = mainTip; sha && bySha.has(sha) && !mainline.has(sha); sha = bySha.get(sha)!.parents[0] ?? null) {
    mainline.add(sha);
  }

  // lanes[i] is the commit the line in track i is heading for (null: track free).
  const lanes: (string | null)[] = [null];
  const freeLane = (): number => {
    for (let i = 1; i < lanes.length; i += 1) if (lanes[i] === null) return i;
    lanes.push(null);
    return lanes.length - 1;
  };

  const placed: PlacedCommit[] = [];
  const pending: { fromRow: number; fromLane: number; viaLane: number; parent: string; ghost: boolean }[] = [];

  commits.forEach((commit, row) => {
    let lane = 0;
    if (!mainline.has(commit.sha)) {
      lane = lanes.indexOf(commit.sha, 1);
      if (lane === -1) lane = freeLane();
    }
    // Every line that was heading here has arrived.
    for (let i = 0; i < lanes.length; i += 1) if (lanes[i] === commit.sha) lanes[i] = null;
    // Hold the track while this commit decides where its lines go next.
    lanes[lane] = commit.sha;
    placed.push({ commit, row, lane });

    let continued = false;
    commit.parents.forEach((parent, position) => {
      if (!bySha.has(parent)) return; // history cut off
      let viaLane: number;
      if (position === 0) {
        viaLane = lane;
        lanes[lane] = parent;
        continued = true;
      } else {
        viaLane = lanes.indexOf(parent, 1);
        if (viaLane === -1) {
          viaLane = freeLane();
          lanes[viaLane] = parent;
        }
      }
      pending.push({ fromRow: row, fromLane: lane, viaLane, parent, ghost: !commit.reachable });
    });
    if (!continued) lanes[lane] = null;
  });

  const position = new Map(placed.map((entry) => [entry.commit.sha, entry]));
  const edges = pending.map((edge): MapEdge => {
    const target = position.get(edge.parent)!;
    return {
      key: `${edge.fromRow}-${edge.viaLane}-${target.row}`,
      fromRow: edge.fromRow,
      fromLane: edge.fromLane,
      viaLane: edge.viaLane,
      toRow: target.row,
      toLane: target.lane,
      ghost: edge.ghost || !target.commit.reachable,
    };
  });

  const laneCount = Math.max(1, ...placed.map((entry) => entry.lane + 1), ...edges.map((edge) => edge.viaLane + 1));
  return { placed, edges, laneCount };
}

/** SVG path for one edge, given functions that turn tracks and rows into pixels. */
export function edgePath(edge: MapEdge, x: (lane: number) => number, y: (row: number) => number): string {
  const x1 = x(edge.fromLane);
  const y1 = y(edge.fromRow);
  const xv = x(edge.viaLane);
  const x2 = x(edge.toLane);
  const y2 = y(edge.toRow);
  // Bends happen within one row: just below the child, or just above the parent.
  const yLeave = y(edge.fromRow + 1);
  const yJoin = y(edge.toRow - 1);
  const curve = (fromX: number, fromY: number, toX: number, toY: number) => {
    const middle = (fromY + toY) / 2;
    return `C ${fromX} ${middle}, ${toX} ${middle}, ${toX} ${toY}`;
  };

  if (edge.fromLane === edge.viaLane && edge.viaLane === edge.toLane) return `M ${x1} ${y1} L ${x2} ${y2}`;

  const leaves = edge.viaLane !== edge.fromLane;
  const joins = edge.viaLane !== edge.toLane;
  if (edge.toRow - edge.fromRow === 1) return `M ${x1} ${y1} ${curve(x1, y1, x2, y2)}`;

  let path = `M ${x1} ${y1}`;
  if (leaves) path += ` ${curve(x1, y1, xv, yLeave)}`;
  if (joins) path += ` L ${xv} ${yJoin} ${curve(xv, yJoin, x2, y2)}`;
  else path += ` L ${xv} ${y2}`;
  return path;
}
