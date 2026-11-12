import { Button } from '../../components/Button.tsx';
import { Dialog } from '../../components/Dialog.tsx';
import { useUiStore } from '../../state/uiStore.ts';
import styles from './ShortcutsDialog.module.css';

export function ShortcutsDialog() {
  const close = useUiStore((state) => state.closeShortcuts);

  return (
    <Dialog
      title="Keyboard Shortcuts & Quick Guide"
      width="medium"
      onClose={close}
      actions={<Button variant="signal" onClick={close}>Done</Button>}
    >
      <div className={styles.container}>
        <div className={styles.section}>
          <h3 className={styles.heading}>Navigation & Panels</h3>
          <div className={styles.grid}>
            <div className={styles.row}>
              <span className={styles.label}>Command & Lesson Search</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>⌘</kbd> / <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>K</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>This shortcuts guide</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>?</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Focus Lesson Panel</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Alt</kbd> + <kbd className={styles.kbd}>1</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Focus Workbench (Terminal)</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Alt</kbd> + <kbd className={styles.kbd}>2</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Focus Line Map Panel</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Alt</kbd> + <kbd className={styles.kbd}>3</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Previous / Next Station</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>[</kbd> / <kbd className={styles.kbd}>]</kbd>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.heading}>Terminal & Workbench</h3>
          <div className={styles.grid}>
            <div className={styles.row}>
              <span className={styles.label}>Clear Terminal screen</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>L</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Browse command history</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>&uarr;</kbd> / <kbd className={styles.kbd}>&darr;</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Tab auto-complete commands</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Tab</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Stop active command</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>C</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Save file in editor</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>⌘</kbd> / <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>S</kbd>
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Close dialogs / dismiss</span>
              <span className={styles.keys}>
                <kbd className={styles.kbd}>Esc</kbd>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.legend}>
          <p className={styles.legendTitle}>The Three Git Places:</p>
          <p>
            <strong>1. Working directory:</strong> files physically on your computer. Modifying them marks them red.<br />
            <strong>2. Staging area (Index):</strong> prepared changes for your next commit (<code className="prose-code">git add</code>).<br />
            <strong>3. Last commit (HEAD):</strong> permanent historical snapshot (<code className="prose-code">git commit</code>).
          </p>
        </div>
      </div>
    </Dialog>
  );
}
