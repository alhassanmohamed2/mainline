import { chapters, type Chapter, type Step } from '@mainline/curriculum';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon.tsx';
import { runCommand } from '../../services/commands.ts';
import { useLessonStore } from '../../state/lessonStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './CommandPalette.module.css';

interface StationResult {
  kind: 'station';
  id: string;
  chapter: Chapter;
  step: Step;
  index: number;
}

interface CommandResult {
  kind: 'command';
  id: string;
  command: string;
  description: string;
}

interface ActionItem {
  kind: 'action';
  id: string;
  title: string;
  meta: string;
  icon: 'sun' | 'moon' | 'refresh' | 'terminal' | 'keyboard';
  action: () => void;
}

type PaletteItem = StationResult | CommandResult | ActionItem;

const COMMON_COMMANDS = [
  { command: 'git status', description: 'Show the working tree status' },
  { command: 'git log --oneline --graph --all', description: 'Show commit graph and all branch pointers' },
  { command: 'git diff', description: 'Show unstaged changes in working directory' },
  { command: 'git diff --staged', description: 'Show staged changes ready to be committed' },
  { command: 'git branch -vv', description: 'List branches with upstream tracking details' },
  { command: 'git stash', description: 'Stash uncommitted changes in working directory' },
  { command: 'git stash pop', description: 'Restore and apply the most recently stashed changes' },
  { command: 'git add .', description: 'Stage all modified and untracked files' },
  { command: 'git restore --staged .', description: 'Unstage all staged files from index' },
  { command: 'git remote -v', description: 'List all configured remotes with their URLs' },
  { command: 'git show HEAD', description: 'Inspect the current commit and its diff' },
];

export function CommandPalette() {
  const closeSearch = useUiStore((state) => state.closeSearch);
  const openChapter = useLessonStore((state) => state.openChapter);
  const openStep = useLessonStore((state) => state.openStep);
  const setPane = useUiStore((state) => state.setPane);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const theme = useUiStore((state) => state.theme);
  const openShortcuts = useUiStore((state) => state.openShortcuts);
  const openResetDialog = useUiStore((state) => state.openResetDialog);
  const setTerminalDraft = useUiStore((state) => state.setTerminalDraft);
  const clearTerminal = useTerminalStore((state) => state.clear);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    // App actions
    const actions: ActionItem[] = [
      {
        kind: 'action',
        id: 'action-theme',
        title: theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme',
        meta: 'Toggle visual appearance',
        icon: theme === 'dark' ? 'sun' : 'moon',
        action: toggleTheme,
      },
      {
        kind: 'action',
        id: 'action-shortcuts',
        title: 'Keyboard Shortcuts',
        meta: 'View quick keys cheat sheet',
        icon: 'keyboard',
        action: () => {
          closeSearch();
          openShortcuts();
        },
      },
      {
        kind: 'action',
        id: 'action-reset',
        title: 'Reset Sandbox',
        meta: 'Rebuild playground from fresh or choose starting point',
        icon: 'refresh',
        action: () => {
          closeSearch();
          openResetDialog(null);
        },
      },
      {
        kind: 'action',
        id: 'action-clear-term',
        title: 'Clear Terminal Output',
        meta: 'Clear all previous log entries',
        icon: 'terminal',
        action: () => {
          clearTerminal();
          closeSearch();
        },
      },
    ];

    if (!q) {
      // Default: show first few lessons, top commands, and app actions
      const featuredStations: StationResult[] = [];
      for (const chapter of chapters.slice(0, 4)) {
        if (chapter.steps[0]) {
          featuredStations.push({
            kind: 'station',
            id: `station-${chapter.id}-${chapter.steps[0].id}`,
            chapter,
            step: chapter.steps[0],
            index: 0,
          });
        }
      }
      const featuredCmds: CommandResult[] = COMMON_COMMANDS.slice(0, 4).map((c) => ({
        kind: 'command',
        id: `cmd-${c.command}`,
        command: c.command,
        description: c.description,
      }));
      return [...actions, ...featuredStations, ...featuredCmds];
    }

    const matchedStations: StationResult[] = [];
    for (const chapter of chapters) {
      chapter.steps.forEach((step, index) => {
        const inTitle = step.title.toLowerCase().includes(q);
        const inChapter = chapter.title.toLowerCase().includes(q);
        const inBody = step.body.some((p) => p.toLowerCase().includes(q));
        const inActions = step.actions.some((a) =>
          a.kind === 'run'
            ? a.run.toLowerCase().includes(q) || a.anatomy.some((an) => an.part.toLowerCase().includes(q) || an.note.toLowerCase().includes(q))
            : a.file.toLowerCase().includes(q) || a.goal.toLowerCase().includes(q),
        );
        const inTerm = step.term && (step.term.name.toLowerCase().includes(q) || step.term.text.toLowerCase().includes(q));

        if (inTitle || inChapter || inBody || inActions || inTerm) {
          matchedStations.push({
            kind: 'station',
            id: `station-${chapter.id}-${step.id}`,
            chapter,
            step,
            index,
          });
        }
      });
    }

    const matchedCommands: CommandResult[] = COMMON_COMMANDS.filter(
      (c) => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    ).map((c) => ({
      kind: 'command',
      id: `cmd-${c.command}`,
      command: c.command,
      description: c.description,
    }));

    const matchedActions = actions.filter((a) => a.title.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q));

    return [...matchedStations, ...matchedCommands, ...matchedActions];
  }, [query, theme, toggleTheme, openShortcuts, openResetDialog, closeSearch, clearTerminal]);

  const selectItem = (item: PaletteItem) => {
    if (item.kind === 'station') {
      openChapter(item.chapter.id);
      openStep(item.step.id);
      setPane('lesson');
      closeSearch();
    } else if (item.kind === 'command') {
      setPane('stage');
      setTerminalDraft(item.command);
      void runCommand(item.command, 'typed');
      closeSearch();
    } else if (item.kind === 'action') {
      item.action();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = items[selectedIndex];
      if (current) selectItem(current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected element visible
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selectedEl = list.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className={styles.overlay} onClick={closeSearch} onKeyDown={handleKeyDown}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command & curriculum search">
        <div className={styles.searchRow}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons, git commands, topics... (e.g. rebase, commit, stash)"
            spellCheck={false}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div ref={listRef} className={styles.results} role="listbox">
          {items.length === 0 ? (
            <div className={styles.empty}>
              No matching stations, commands or actions for &ldquo;{query}&rdquo;
            </div>
          ) : (
            items.map((item, index) => {
              const selected = index === selectedIndex;
              if (item.kind === 'station') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.item}
                    data-selected={selected}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className={styles.itemMain}>
                      <span
                        className={styles.bullet}
                        style={{ '--bullet-color': `var(--line-${item.chapter.color})` } as CSSProperties}
                        aria-hidden="true"
                      >
                        {item.chapter.number}
                      </span>
                      <div className={styles.itemText}>
                        <span className={styles.itemTitle}>{item.step.title}</span>
                        <span className={styles.itemMeta}>
                          Line {item.chapter.number}: {item.chapter.title} &middot; Station {item.index + 1}
                        </span>
                      </div>
                    </div>
                    <span className={styles.badge}>Jump to station</span>
                  </button>
                );
              }
              if (item.kind === 'command') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.item}
                    data-selected={selected}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className={styles.itemMain}>
                      <span className={styles.bullet} aria-hidden="true">
                        $
                      </span>
                      <div className={styles.itemText}>
                        <span className={styles.itemCommand}>{item.command}</span>
                        <span className={styles.itemMeta}>{item.description}</span>
                      </div>
                    </div>
                    <span className={styles.badge}>Run in terminal</span>
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  className={styles.item}
                  data-selected={selected}
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={styles.itemMain}>
                    <span className={styles.bullet} aria-hidden="true">
                      <Icon name={item.icon} size={13} />
                    </span>
                    <div className={styles.itemText}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemMeta}>{item.meta}</span>
                    </div>
                  </div>
                  <span className={styles.badge}>Action</span>
                </button>
              );
            })
          )}
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerHints}>
            <span className={styles.hint}>
              <kbd className={styles.kbd}>&uarr;</kbd> <kbd className={styles.kbd}>&darr;</kbd> Navigate
            </span>
            <span className={styles.hint}>
              <kbd className={styles.kbd}>&crarr;</kbd> Select
            </span>
          </div>
          <span>Tip: Press <strong>?</strong> anytime for keyboard shortcuts</span>
        </footer>
      </div>
    </div>
  );
}
