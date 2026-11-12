import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './ResizeGutter.module.css';

interface ResizeGutterProps {
  direction?: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
  onReset?: () => void;
  label: string;
  className?: string;
  'data-gutter'?: string;
}

export function ResizeGutter({
  direction = 'vertical',
  onResize,
  onReset,
  label,
  className,
  'data-gutter': dataGutter,
}: ResizeGutterProps) {
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Only drag on primary mouse button (left-click) or touch
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const pointerId = event.pointerId;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Fallback if pointer capture unsupported
    }

    setDragging(true);

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    let lastCoord = direction === 'vertical' ? event.clientX : event.clientY;

    const onPointerMove = (e: globalThis.PointerEvent) => {
      e.preventDefault();
      const current = direction === 'vertical' ? e.clientX : e.clientY;
      const delta = current - lastCoord;
      if (delta !== 0) {
        lastCoord = current;
        onResize(delta);
      }
    };

    const cleanup = (e: globalThis.PointerEvent) => {
      setDragging(false);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', cleanup);
      window.removeEventListener('pointercancel', cleanup);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', cleanup);
    window.addEventListener('pointercancel', cleanup);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 16;
    if (direction === 'vertical') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onResize(-step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onResize(step);
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onResize(-step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        onResize(step);
      }
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      onReset?.();
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      data-gutter={dataGutter}
      aria-label={label}
      aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      className={`${styles.gutter} ${styles[direction]} ${className ?? ''}`.trim()}
      data-dragging={dragging || undefined}
      onPointerDown={handlePointerDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      title={`${label}. Drag to resize, double-click or Enter to reset.`}
    >
      <div className={styles.handle} aria-hidden="true" />
    </div>
  );
}
