import { MotionConfig } from 'motion/react';
import { useEffect, type CSSProperties } from 'react';
import { Button } from '../components/Button.tsx';
import { Icon, type IconName } from '../components/Icon.tsx';
import { ResizeGutter } from '../components/ResizeGutter.tsx';
import { Board } from '../features/board/Board.tsx';
import { CommandPalette } from '../features/dialogs/CommandPalette.tsx';
import { ConfirmDialog } from '../features/dialogs/ConfirmDialog.tsx';
import { ResetDialog } from '../features/dialogs/ResetDialog.tsx';
import { ShortcutsDialog } from '../features/dialogs/ShortcutsDialog.tsx';
import { FileEditor } from '../features/editor/FileEditor.tsx';
import { EffectsStrip } from '../features/effects/EffectsStrip.tsx';
import { LessonPanel } from '../features/lesson/LessonPanel.tsx';
import { MapPanel } from '../features/map/MapPanel.tsx';
import { Terminal } from '../features/terminal/Terminal.tsx';
import { boot, refreshSnapshot } from '../services/session.ts';
import { useRepoStore } from '../state/repoStore.ts';
import { useUiStore, type Pane } from '../state/uiStore.ts';
import styles from './App.module.css';
import { TopBar } from './TopBar.tsx';

const PANES: { id: Pane; label: string; icon: IconName }[] = [
  { id: 'lesson', label: 'Lesson', icon: 'book' },
  { id: 'stage', label: 'Workbench', icon: 'terminal' },
  { id: 'map', label: 'Map', icon: 'map' },
];

export function App() {
  const status = useRepoStore((state) => state.status);
  const offlineReason = useRepoStore((state) => state.offlineReason);
  const hasSnapshot = useRepoStore((state) => state.snapshot !== null);
  const theme = useUiStore((state) => state.theme);
  const pane = useUiStore((state) => state.pane);
  const setPane = useUiStore((state) => state.setPane);
  const editor = useUiStore((state) => state.editor);
  const confirm = useUiStore((state) => state.confirm);
  const resetDialog = useUiStore((state) => state.resetDialog);
  const searchOpen = useUiStore((state) => state.searchOpen);
  const openSearch = useUiStore((state) => state.openSearch);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const shortcutsOpen = useUiStore((state) => state.shortcutsOpen);
  const openShortcuts = useUiStore((state) => state.openShortcuts);
  const closeShortcuts = useUiStore((state) => state.closeShortcuts);
  const lessonWidth = useUiStore((state) => state.lessonWidth);
  const mapWidth = useUiStore((state) => state.mapWidth);
  const terminalHeight = useUiStore((state) => state.terminalHeight);
  const adjustLessonWidth = useUiStore((state) => state.adjustLessonWidth);
  const adjustMapWidth = useUiStore((state) => state.adjustMapWidth);
  const adjustTerminalHeight = useUiStore((state) => state.adjustTerminalHeight);
  const resetLessonWidth = useUiStore((state) => state.resetLessonWidth);
  const resetMapWidth = useUiStore((state) => state.resetMapWidth);
  const resetTerminalHeight = useUiStore((state) => state.resetTerminalHeight);

  useEffect(() => {
    void boot();
    // The playground is a real folder: it may have changed while the learner was elsewhere.
    const onFocus = () => void refreshSnapshot();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Cmd+K or Ctrl+K for search palette
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else openSearch();
        return;
      }

      // ? for shortcuts (when not in an input)
      if (event.key === '?' && !isInput && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (shortcutsOpen) closeShortcuts();
        else openShortcuts();
        return;
      }

      // Alt+1, Alt+2, Alt+3 for pane switching
      if (event.altKey && !event.metaKey && !event.ctrlKey) {
        if (event.key === '1') {
          event.preventDefault();
          setPane('lesson');
        } else if (event.key === '2') {
          event.preventDefault();
          setPane('stage');
        } else if (event.key === '3') {
          event.preventDefault();
          setPane('map');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchOpen, shortcutsOpen, openSearch, closeSearch, openShortcuts, closeShortcuts, setPane]);

  if (!hasSnapshot) {
    return (
      <div className={styles.splash}>
        <svg className={styles.splashMark} viewBox="0 0 120 24" aria-hidden="true">
          <path d="M4 12h112" stroke="var(--signal)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="12" r="7.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4.5" />
        </svg>
        {status === 'offline' ? (
          <>
            <h1 className={styles.splashTitle}>The Mainline server is not answering</h1>
            <p>
              {offlineReason} Start it from the project folder with <code className="prose-code">npm run dev</code> (or{' '}
              <code className="prose-code">npm start</code>), then try again.
            </p>
            <Button variant="signal" icon="refresh" onClick={() => void boot()}>
              Try again
            </Button>
          </>
        ) : (
          <p className={styles.splashLoading}>Reading the playground…</p>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.app} data-pane={pane}>
        <TopBar />
        {status === 'offline' ? (
          <div className={styles.offline} role="alert">
            <Icon name="warning" size={15} />
            <span>Lost the connection to the Mainline server. Commands will not run until it is back.</span>
            <Button size="small" variant="ink" onClick={() => void boot()}>
              Reconnect
            </Button>
          </div>
        ) : null}

        <main
          className={styles.columns}
          style={
            {
              '--lesson-width': `${lessonWidth}px`,
              '--map-width': `${mapWidth}px`,
              '--terminal-height': `${terminalHeight}px`,
            } as CSSProperties
          }
        >
          <div className={styles.lesson}>
            <LessonPanel />
          </div>
          <ResizeGutter
            direction="vertical"
            data-gutter="lesson"
            label="Resize lesson panel"
            onResize={adjustLessonWidth}
            onReset={resetLessonWidth}
          />
          <div className={styles.stage}>
            <div className={styles.boardSlot}>
              <Board />
            </div>
            <ResizeGutter
              direction="horizontal"
              label="Resize workbench panels"
              onResize={adjustTerminalHeight}
              onReset={resetTerminalHeight}
            />
            <EffectsStrip />
            <div className={styles.terminalSlot}>
              <Terminal />
            </div>
          </div>
          <ResizeGutter
            direction="vertical"
            data-gutter="map"
            label="Resize map panel"
            onResize={adjustMapWidth}
            onReset={resetMapWidth}
          />
          <div className={styles.map}>
            <MapPanel />
          </div>
        </main>

        <nav className={styles.paneTabs} aria-label="Sections">
          {PANES.map(({ id, label, icon }) => (
            <button key={id} type="button" data-pane-id={id} aria-current={pane === id ? 'page' : undefined} onClick={() => setPane(id)}>
              <Icon name={icon} size={18} />
              {label}
            </button>
          ))}
        </nav>

        {editor ? <FileEditor key={editor.path} path={editor.path} fresh={editor.fresh} initialTab={editor.tab} /> : null}
        {resetDialog ? <ResetDialog chapterId={resetDialog.chapterId} /> : null}
        {confirm ? <ConfirmDialog request={confirm} /> : null}
        {searchOpen ? <CommandPalette /> : null}
        {shortcutsOpen ? <ShortcutsDialog /> : null}
      </div>
    </MotionConfig>
  );
}
