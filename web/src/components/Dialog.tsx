import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons, right-aligned under the content. */
  actions?: ReactNode;
  width?: 'narrow' | 'medium' | 'wide';
  tone?: 'default' | 'danger';
}

/** A modal built on the native <dialog>: focus trapping and Escape come for free. */
export function Dialog({ title, onClose, children, actions, width = 'narrow', tone = 'default' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[width]} ${tone === 'danger' ? styles.danger : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.content}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </dialog>
  );
}
