import type { ReactNode } from 'react';
import styles from './Plate.module.css';

/** A small signage-style label: uppercase, heavy, on a solid plate. */
export function Plate({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'outline' | 'signal' }) {
  return <span className={`${styles.plate} ${styles[tone]}`}>{children}</span>;
}
