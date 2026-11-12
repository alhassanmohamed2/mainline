export const shortSha = (sha: string | null | undefined): string => (sha ? sha.slice(0, 7) : '');

const UNITS: [limit: number, seconds: number, name: string][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86_400, 3600, 'hour'],
  [2_592_000, 86_400, 'day'],
  [31_536_000, 2_592_000, 'month'],
  [Infinity, 31_536_000, 'year'],
];

/** "3 minutes ago" */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  for (const [limit, size, name] of UNITS) {
    if (seconds < limit) {
      const value = Math.floor(seconds / size);
      return `${value} ${name}${value === 1 ? '' : 's'} ago`;
    }
  }
  return '';
}

export function duration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;
