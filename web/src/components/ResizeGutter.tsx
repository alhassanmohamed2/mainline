import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './ResizeGutter.module.css';

interface ResizeGutterProps {
  direction?: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
  onReset?: () => void;
  label: string;
}

export function ResizeGutter({ direction = 'vertical', onResize, onReset, label }: ResizeGutterProps) {
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startCoord = direction === 'vertical' ? event.clientX : event.clientY;
    let lastCoord = startCoord;

    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const currentCoord = direction === 'vertical' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentCoord - lastCoord;
      lastCoord = currentCoord;
      onResize(delta);
    };

    const onPointerUp = (upEvent: globalThis.PointerEvent) => {
      setDragging(false);
      try {
        event.currentTarget.releasePointerCapture(upEvent.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 12;
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
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      className={`${styles.gutter} ${styles[direction]}`}
      data-dragging={dragging || undefined}
      onPointerDown={handlePointerDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      title={`${label}. Drag to resize, double-click to reset.`}
    >
      <div className={styles.handle} aria-hidden="true" />
    </div>
  );
}
