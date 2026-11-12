import type { RepoSnapshot, SystemInfo } from '@mainline/shared';
import { create } from 'zustand';
import { describeEffects, type Effect } from '../features/effects/describeEffects.ts';

interface RepoState {
  status: 'loading' | 'ready' | 'offline';
  offlineReason: string | null;
  system: SystemInfo | null;
  snapshot: RepoSnapshot | null;
  /** What the last command changed, derived from the snapshots around it. */
  effects: Effect[];
  effectsCause: string | null;

  setSystem: (system: SystemInfo) => void;
  setOffline: (reason: string) => void;
  /**
   * Stores a new snapshot. With a cause (the command that ran), the difference
   * to the previous snapshot is described as that command's effects.
   */
  applySnapshot: (snapshot: RepoSnapshot, cause: string | null) => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  status: 'loading',
  offlineReason: null,
  system: null,
  snapshot: null,
  effects: [],
  effectsCause: null,

  setSystem: (system) => set({ system }),
  setOffline: (reason) => set({ status: 'offline', offlineReason: reason }),
  applySnapshot: (snapshot, cause) => {
    const previous = get().snapshot;
    if (cause === null) {
      set({ snapshot, status: 'ready', offlineReason: null });
      return;
    }
    set({
      snapshot,
      status: 'ready',
      offlineReason: null,
      effects: describeEffects(previous, snapshot),
      effectsCause: cause,
    });
  },
}));
