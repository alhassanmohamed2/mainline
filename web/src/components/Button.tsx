import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon.tsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** signal: the one primary action. ink: strong secondary. quiet: outline. danger: destructive. */
  variant?: 'signal' | 'ink' | 'quiet' | 'danger';
  size?: 'small' | 'medium';
  icon?: IconName;
  busy?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'quiet', size = 'medium', icon, busy, children, className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], children ? '' : styles.iconOnly, className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className={styles.spinner} aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'small' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}
