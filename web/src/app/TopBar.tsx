import { chapters } from '@mainline/curriculum';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import { actionKey, useLessonStore } from '../state/lessonStore.ts';
import { useRepoStore } from '../state/repoStore.ts';
import { useUiStore } from '../state/uiStore.ts';
import styles from './TopBar.module.css';

/** The sign above everything: what this is, where it runs, and what it found installed. */
export function TopBar() {
  const system = useRepoStore((state) => state.system);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const openResetDialog = useUiStore((state) => state.openResetDialog);
  const openSearch = useUiStore((state) => state.openSearch);
  const openShortcuts = useUiStore((state) => state.openShortcuts);
  const done = useLessonStore((state) => state.done);
  const [copied, setCopied] = useState(false);

  const { completedSteps, totalSteps, pct } = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const ch of chapters) {
      for (const step of ch.steps) {
        total += 1;
        const stepComplete = step.actions.length > 0 && step.actions.every((_, i) => actionKey(ch.id, step.id, i) in done);
        if (stepComplete) completed += 1;
      }
    }
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedSteps: completed, totalSteps: total, pct: percentage };
  }, [done]);

  const copyPath = async () => {
    if (!system) return;
    try {
      await navigator.clipboard.writeText(system.sandbox.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be refused; the path is still visible in the tooltip.
    }
  };

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <svg className={styles.mark} viewBox="0 0 44 24" aria-hidden="true">
          <path d="M2 12h40" stroke="var(--signal)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="22" cy="12" r="7.5" fill="var(--term-bg)" stroke="var(--signal)" strokeWidth="4.5" />
        </svg>
        <span className={styles.name}>Mainline</span>
        <span className={styles.tagline}>git and GitHub, with every command run for real</span>
      </div>

      <div className={styles.center}>
        <button
          type="button"
          className={styles.progressBadge}
          onClick={() => openResetDialog(null)}
          title={`${completedSteps} of ${totalSteps} stations completed (${pct}%). Click to reset progress or manage sandbox.`}
          aria-label={`Progress: ${completedSteps} of ${totalSteps} stations completed (${pct}%)`}
        >
          <div className={styles.progressRing} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="9" fill="none" stroke="var(--term-rule)" strokeWidth="2.5" />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="var(--signal)"
                strokeWidth="2.5"
                strokeDasharray={56.5}
                strokeDashoffset={56.5 - (56.5 * pct) / 100}
                strokeLinecap="round"
                transform="rotate(-90 12 12)"
              />
            </svg>
          </div>
          <span className={styles.progressText}>{pct}% done</span>
          <span className={styles.progressDetail}>({completedSteps}/{totalSteps})</span>
        </button>

        <button
          type="button"
          className={styles.searchBtn}
          onClick={openSearch}
          title="Search lessons, git commands, and topics (⌘K / Ctrl+K)"
        >
          <Icon name="search" size={13} />
          <span className={styles.searchLabel}>Find topic or command</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
      </div>

      {system ? (
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.path}
            onClick={copyPath}
            title={`The playground folder on this computer:\n${system.sandbox.path}\nClick to copy.`}
          >
            <span className={styles.pathLabel}>{copied ? 'copied' : 'folder'}</span>
            <span className={styles.pathValue}>
              <bdi>{system.sandbox.path}</bdi>
            </span>
            <Icon name="copy" size={13} />
          </button>

          <span className={styles.chip} data-ok={system.git !== null} title={system.git ? `git ${system.git.version}` : 'git was not found'}>
            <span className={styles.dot} aria-hidden="true" />
            git{system.git ? '' : ' missing'}
          </span>
          <span
            className={styles.chip}
            data-ok={system.gh.loggedIn}
            title={
              !system.gh.installed
                ? 'The GitHub CLI was not found. Only needed for chapters 7 and 8.'
                : system.gh.loggedIn
                  ? `gh ${system.gh.version}, logged in as ${system.gh.user ?? 'your account'}`
                  : 'gh is installed but not logged in. Run "gh auth login" in your own terminal.'
            }
          >
            <span className={styles.dot} aria-hidden="true" />
            {!system.gh.installed ? 'gh missing' : system.gh.loggedIn ? (system.gh.user ?? 'gh') : 'gh logged out'}
          </span>

          <button type="button" className={styles.action} onClick={() => openResetDialog(null)} title="Reset sandbox repository">
            <Icon name="refresh" size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className={styles.iconAction}
            onClick={openShortcuts}
            title="Keyboard shortcuts & guide (?)"
            aria-label="Keyboard shortcuts"
          >
            <Icon name="help" size={15} />
          </button>
          <button
            type="button"
            className={styles.iconAction}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>
        </div>
      ) : null}
    </header>
  );
}
