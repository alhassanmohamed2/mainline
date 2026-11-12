import type { GitHubState } from '@mainline/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type RightTab = 'map' | 'internals' | 'github';
export type Pane = 'lesson' | 'stage' | 'map';

export interface ConfirmRequest {
  command: string;
  title: string;
  details: string[];
  danger: boolean;
  resolve: (approved: boolean) => void;
}

interface UiState {
  theme: Theme;
  showGhosts: boolean;
  rightTab: RightTab;
  /** Which column is visible on narrow screens. */
  pane: Pane;
  selectedCommit: string | null;
  /** The file open in the editor. `fresh` means it does not exist on disk yet. */
  editor: { path: string; fresh: boolean; tab?: 'edit' | 'changes' } | null;
  confirm: ConfirmRequest | null;
  /** Open when not null; `chapterId` preselects a chapter's starting point. */
  resetDialog: { chapterId: string | null } | null;
  github: GitHubState | null;
  githubLoading: boolean;
  searchOpen: boolean;
  shortcutsOpen: boolean;
  terminalDraft: string | null;
  lessonWidth: number;
  mapWidth: number;
  terminalHeight: number;

  toggleTheme: () => void;
  toggleGhosts: () => void;
  setRightTab: (tab: RightTab) => void;
  setPane: (pane: Pane) => void;
  selectCommit: (sha: string | null) => void;
  openEditor: (path: string, fresh?: boolean, tab?: 'edit' | 'changes') => void;
  closeEditor: () => void;
  /** Shows the confirmation dialog and resolves with the learner's answer. */
  askConfirm: (request: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>;
  answerConfirm: (approved: boolean) => void;
  openResetDialog: (chapterId: string | null) => void;
  closeResetDialog: () => void;
  setGitHub: (github: GitHubState | null, loading: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  setTerminalDraft: (draft: string | null) => void;
  setLessonWidth: (w: number) => void;
  setMapWidth: (w: number) => void;
  setTerminalHeight: (h: number) => void;
  adjustLessonWidth: (delta: number) => void;
  adjustMapWidth: (delta: number) => void;
  adjustTerminalHeight: (delta: number) => void;
  resetLessonWidth: () => void;
  resetMapWidth: () => void;
  resetTerminalHeight: () => void;
  resetLayoutSizes: () => void;
}

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: prefersDark() ? 'dark' : 'light',
      showGhosts: true,
      rightTab: 'map',
      pane: 'lesson',
      selectedCommit: null,
      editor: null,
      confirm: null,
      resetDialog: null,
      github: null,
      githubLoading: false,
      searchOpen: false,
      shortcutsOpen: false,
      terminalDraft: null,
      lessonWidth: 370,
      mapWidth: 360,
      terminalHeight: 260,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      toggleGhosts: () => set((state) => ({ showGhosts: !state.showGhosts })),
      setRightTab: (rightTab) => set({ rightTab }),
      setPane: (pane) => set({ pane }),
      selectCommit: (selectedCommit) => set({ selectedCommit }),
      openEditor: (path, fresh = false, tab = 'edit') => set({ editor: { path, fresh, tab } }),
      closeEditor: () => set({ editor: null }),
      askConfirm: (request) =>
        new Promise<boolean>((resolve) => {
          get().confirm?.resolve(false);
          set({ confirm: { ...request, resolve } });
        }),
      answerConfirm: (approved) => {
        get().confirm?.resolve(approved);
        set({ confirm: null });
      },
      openResetDialog: (chapterId) => set({ resetDialog: { chapterId } }),
      closeResetDialog: () => set({ resetDialog: null }),
      setGitHub: (github, githubLoading) => set({ github, githubLoading }),
      openSearch: () => set({ searchOpen: true }),
      closeSearch: () => set({ searchOpen: false }),
      openShortcuts: () => set({ shortcutsOpen: true }),
      closeShortcuts: () => set({ shortcutsOpen: false }),
      setTerminalDraft: (terminalDraft) => set({ terminalDraft }),
      setLessonWidth: (lessonWidth) => set({ lessonWidth }),
      setMapWidth: (mapWidth) => set({ mapWidth }),
      setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
      adjustLessonWidth: (delta) =>
        set((state) => ({
          lessonWidth: Math.min(650, Math.max(260, state.lessonWidth + delta)),
        })),
      adjustMapWidth: (delta) =>
        set((state) => ({
          mapWidth: Math.min(650, Math.max(260, state.mapWidth - delta)),
        })),
      adjustTerminalHeight: (delta) =>
        set((state) => ({
          terminalHeight: Math.min(600, Math.max(160, state.terminalHeight - delta)),
        })),
      resetLessonWidth: () => set({ lessonWidth: 370 }),
      resetMapWidth: () => set({ mapWidth: 360 }),
      resetTerminalHeight: () => set({ terminalHeight: 260 }),
      resetLayoutSizes: () => set({ lessonWidth: 370, mapWidth: 360, terminalHeight: 260 }),
    }),
    {
      name: 'mainline.ui',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        showGhosts: state.showGhosts,
        lessonWidth: state.lessonWidth,
        mapWidth: state.mapWidth,
        terminalHeight: state.terminalHeight,
      }),
    },
  ),
);
