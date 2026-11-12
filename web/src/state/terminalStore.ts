import type { Impact, SetupLogLine } from '@mainline/shared';
import { create } from 'zustand';

export type EntryStatus = 'running' | 'done' | 'rejected' | 'cancelled' | 'stopped';

export interface TerminalEntry {
  id: number;
  /** The prompt as it looked when the command was entered, e.g. "playground (main)". */
  prompt: string;
  command: string;
  origin: 'lesson' | 'typed' | 'setup';
  output: string;
  status: EntryStatus;
  exitCode: number | null;
  durationMs: number | null;
  impact: Impact | null;
  /** Why the command did not run. */
  note: { reason: string; hint?: string } | null;
  /** For a sandbox setup entry: the commands that were replayed. */
  setupLog: SetupLogLine[] | null;
}

const MAX_ENTRIES = 150;
const MAX_OUTPUT = 300_000;

interface TerminalState {
  entries: TerminalEntry[];
  running: boolean;
  history: string[];
  nextId: number;

  begin: (entry: Pick<TerminalEntry, 'prompt' | 'command' | 'origin'>) => number;
  append: (id: number, data: string) => void;
  patch: (id: number, changes: Partial<TerminalEntry>) => void;
  addSetupEntry: (prompt: string, title: string, log: SetupLogLine[]) => void;
  setRunning: (running: boolean) => void;
  remember: (command: string) => void;
  clear: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  entries: [],
  running: false,
  history: [],
  nextId: 1,

  begin: (entry) => {
    const id = get().nextId;
    const created: TerminalEntry = {
      id,
      ...entry,
      output: '',
      status: 'running',
      exitCode: null,
      durationMs: null,
      impact: null,
      note: null,
      setupLog: null,
    };
    set((state) => ({ entries: [...state.entries, created].slice(-MAX_ENTRIES), nextId: id + 1 }));
    return id;
  },
  append: (id, data) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, output: (entry.output + data).slice(-MAX_OUTPUT) } : entry,
      ),
    })),
  patch: (id, changes) =>
    set((state) => ({ entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)) })),
  addSetupEntry: (prompt, title, log) => {
    const id = get().nextId;
    const failed = log.some((line) => !line.ok);
    const created: TerminalEntry = {
      id,
      prompt,
      command: title,
      origin: 'setup',
      output: '',
      status: 'done',
      exitCode: failed ? 1 : 0,
      durationMs: null,
      impact: 'local',
      note: null,
      setupLog: log,
    };
    set((state) => ({ entries: [...state.entries, created].slice(-MAX_ENTRIES), nextId: id + 1 }));
  },
  setRunning: (running) => set({ running }),
  remember: (command) =>
    set((state) => ({ history: [...state.history.filter((entry) => entry !== command), command].slice(-100) })),
  clear: () => set({ entries: [] }),
}));
