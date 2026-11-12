import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Plate } from '../../components/Plate.tsx';
import { runCommand, stopCommand } from '../../services/commands.ts';
import { promptFor } from '../../services/session.ts';
import { useRepoStore } from '../../state/repoStore.ts';
import { useTerminalStore } from '../../state/terminalStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { EntryView } from './EntryView.tsx';
import styles from './Terminal.module.css';

const SHORTCUTS = [
  { cmd: 'git status', tip: 'Status of working copy & index' },
  { cmd: 'git log --oneline --graph --all', tip: 'Visual commit graph' },
  { cmd: 'git diff', tip: 'Unstaged changes on disk' },
  { cmd: 'git branch -vv', tip: 'Branches & tracking remotes' },
  { cmd: 'help', tip: 'List available commands' },
];

/** Real output from real programs, plus a prompt to run your own. */
export function Terminal() {
  const entries = useTerminalStore((state) => state.entries);
  const running = useTerminalStore((state) => state.running);
  const history = useTerminalStore((state) => state.history);
  const clear = useTerminalStore((state) => state.clear);
  const system = useRepoStore((state) => state.system);
  const snapshot = useRepoStore((state) => state.snapshot);
  const terminalDraft = useUiStore((state) => state.terminalDraft);
  const setTerminalDraft = useUiStore((state) => state.setTerminalDraft);

  const [value, setValue] = useState('');
  /** Position in the history while browsing with the arrow keys; null when typing. */
  const [cursor, setCursor] = useState<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Sync draft from external triggers (lesson actions or board quick actions)
  useEffect(() => {
    if (terminalDraft !== null) {
      setValue(terminalDraft);
      setTerminalDraft(null);
      input.current?.focus({ preventScroll: true });
    }
  }, [terminalDraft, setTerminalDraft]);

  // Follow the output as it streams in, unless the learner scrolled up to read.
  const pinned = useRef(true);
  const last = entries.at(-1);
  useLayoutEffect(() => {
    if (pinned.current) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [entries.length, last?.output.length, last?.status]);

  // A new command always jumps back to the bottom.
  useLayoutEffect(() => {
    pinned.current = true;
    setIsAtBottom(true);
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [entries.length]);

  // The panel itself can shrink (the board above it grows); stay at the bottom then too.
  useEffect(() => {
    const element = log.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) element.scrollTo({ top: element.scrollHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running && document.activeElement === document.body) input.current?.focus({ preventScroll: true });
  }, [running]);

  const suggestions = useMemo(() => {
    const trimmed = value.trimStart();
    if (!trimmed || running) return [];

    const gitSubcommands = [
      'status', 'add', 'commit', 'log', 'branch', 'diff', 'checkout', 'switch',
      'merge', 'rebase', 'reset', 'restore', 'stash', 'push', 'pull', 'remote', 'show', 'clone'
    ];

    if (trimmed.startsWith('git ')) {
      const rest = trimmed.slice(4);
      if (!rest.includes(' ')) {
        return gitSubcommands
          .filter((sub) => sub.startsWith(rest))
          .map((sub) => `git ${sub}`);
      }
      if (rest.startsWith('add ')) {
        const filePart = rest.slice(4).trim();
        const candidates = ['.', ...(snapshot?.worktree.map((f) => f.path) ?? [])];
        return candidates
          .filter((c) => !filePart || c.startsWith(filePart))
          .slice(0, 5)
          .map((c) => `git add ${c}`);
      }
      if (rest.startsWith('checkout ') || rest.startsWith('switch ')) {
        const prefix = rest.startsWith('checkout ') ? 'git checkout ' : 'git switch ';
        const branchPart = rest.replace(/^(checkout|switch)\s+/, '').trim();
        const branches = snapshot?.branches.map((b) => b.name) ?? [];
        return branches
          .filter((b) => !branchPart || b.startsWith(branchPart))
          .map((b) => `${prefix}${b}`);
      }
      if (rest.startsWith('diff ') || rest.startsWith('restore ')) {
        const prefix = rest.startsWith('diff ') ? 'git diff ' : 'git restore ';
        const filePart = rest.replace(/^(diff|restore)\s+/, '').trim();
        const files = snapshot?.worktree.map((f) => f.path) ?? [];
        return files
          .filter((f) => !filePart || f.startsWith(filePart))
          .slice(0, 5)
          .map((f) => `${prefix}${f}`);
      }
    }

    if ('git'.startsWith(trimmed)) return ['git status', 'git log --oneline --graph --all'];
    if ('clear'.startsWith(trimmed)) return ['clear'];
    if ('help'.startsWith(trimmed)) return ['help'];

    return [];
  }, [value, running, snapshot]);

  useEffect(() => {
    setSelectedSuggestion(0);
  }, [suggestions.length]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const command = value.trim();
    if (!command || running) return;

    if (command === 'clear') {
      setValue('');
      setCursor(null);
      clear();
      return;
    }

    setValue('');
    setCursor(null);
    void runCommand(command, 'typed');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+L to clear screen
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clear();
      return;
    }

    // Tab autocomplete
    if (event.key === 'Tab' && suggestions.length > 0) {
      event.preventDefault();
      const chosen = suggestions[selectedSuggestion] ?? suggestions[0];
      if (chosen) setValue(chosen + (chosen.endsWith(' ') ? '' : ' '));
      return;
    }

    // Escape clears input
    if (event.key === 'Escape') {
      event.preventDefault();
      setValue('');
      setCursor(null);
      return;
    }

    // Browse history
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (history.length === 0) return;
      event.preventDefault();
      const position = cursor ?? history.length;
      const next = Math.min(history.length, Math.max(0, position + (event.key === 'ArrowUp' ? -1 : 1)));
      setCursor(next === history.length ? null : next);
      setValue(history[next] ?? '');
    }
  };

  const jumpToBottom = () => {
    pinned.current = true;
    setIsAtBottom(true);
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  };

  const [folder, where] = promptFor(system, snapshot).split(' ');

  return (
    <section className={styles.terminal} aria-label="Terminal">
      <header className={styles.bar}>
        <Plate tone="signal">Terminal</Plate>
        <span className={styles.barNote}>
          real output{system?.git ? ` · git ${system.git.version}` : ''}
          {system?.gh.version ? ` · gh ${system.gh.version}` : ''}
        </span>
        <button type="button" className={styles.clear} onClick={clear} disabled={entries.length === 0} title="Clear terminal screen (Ctrl+L)">
          Clear
        </button>
      </header>

      <div className={styles.logContainer}>
        <div
          ref={log}
          className={`${styles.log} scroll`}
          role="log"
          aria-label="Command output"
          tabIndex={0}
          onScroll={(event) => {
            const element = event.currentTarget;
            const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 24;
            pinned.current = atBottom;
            setIsAtBottom(atBottom);
          }}
          onMouseUp={() => {
            if (!window.getSelection()?.toString()) input.current?.focus({ preventScroll: true });
          }}
        >
          {entries.length === 0 ? (
            <p className={styles.welcome}>
              Nothing has run yet. Press <strong>Run</strong> on a lesson step, or type a git or gh command below.
              {'\n'}Every command runs for real, in the folder shown at the top of the page.
            </p>
          ) : (
            entries.map((entry) => <EntryView key={entry.id} entry={entry} />)
          )}
        </div>

        {!isAtBottom ? (
          <button type="button" className={styles.jumpBottom} onClick={jumpToBottom} aria-label="Scroll to newest output">
            <Icon name="arrowDownCircle" size={14} />
            <span>Latest output</span>
          </button>
        ) : null}
      </div>

      <div className={styles.shortcuts}>
        {SHORTCUTS.map(({ cmd, tip }) => (
          <button
            key={cmd}
            type="button"
            className={styles.shortcut}
            disabled={running}
            title={tip}
            onClick={() => void runCommand(cmd, 'typed')}
          >
            {cmd}
          </button>
        ))}
      </div>

      <div className={styles.inputContainer}>
        {suggestions.length > 0 && document.activeElement === input.current ? (
          <div className={styles.autocomplete} role="listbox">
            {suggestions.map((item, idx) => (
              <button
                key={item}
                type="button"
                className={styles.autoItem}
                data-selected={idx === selectedSuggestion}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(item + ' ');
                  input.current?.focus();
                }}
              >
                <span>{item}</span>
                <kbd className={styles.autoKbd}>Tab</kbd>
              </button>
            ))}
          </div>
        ) : null}

        <form className={styles.inputRow} onSubmit={submit}>
          <label className={styles.prompt} htmlFor="terminal-input">
            <span className={styles.folder}>{folder}</span>
            {where ? <span className={styles.where}> {where}</span> : null}
            <span className={styles.sign}> $</span>
          </label>
          <input
            id="terminal-input"
            ref={input}
            className={styles.input}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setCursor(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={running ? 'running…' : 'type a git or gh command (Tab to complete)'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
          {running ? (
            <Button size="small" variant="danger" icon="stop" onClick={stopCommand}>
              Stop
            </Button>
          ) : (
            <Button size="small" variant="signal" icon="play" type="submit" disabled={!value.trim()}>
              Run
            </Button>
          )}
        </form>
      </div>
    </section>
  );
}
