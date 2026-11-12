const PATHS = {
  play: 'M7 4.5v15l12-7.5z',
  stop: 'M6 6h12v12H6z',
  check: 'M4.5 12.5l5 5 10-11',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  external: 'M14 5h5v5M19 5l-8 8M11 6H6v12h12v-5',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  filePlus: 'M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14h6',
  chevron: 'M9 6l6 6-6 6',
  pencil: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  warning: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4-4zM5 4v12',
  terminal: 'M4 5h16v14H4zM7 9l3 3-3 3M12 15h5',
  map: 'M6 5v8a4 4 0 0 0 4 4h8M6 5a1.5 1.5 0 1 0 0-.01M18 17a1.5 1.5 0 1 0 0-.01M6 13h6a4 4 0 0 0 4-4V7M16 5.5a1.5 1.5 0 1 0 0-.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.35-4.35',
  keyboard: 'M3 6h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm4 4h.01M10 10h.01M14 10h.01M17 10h.01M7 14h10',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6v.01M12 8a2.5 2.5 0 0 1 2.5 2.5c0 1.5-2.5 2-2.5 3.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  arrowDownCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-14v8m-4-4l4 4 4-4',
  diff: 'M9 14l-4-4 4-4M15 10l4 4-4 4',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-11v6m0-8v.01',
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: ReadonlySet<IconName> = new Set(['play', 'stop']);

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
