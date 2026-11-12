/**
 * Turns raw terminal output (with ANSI colour codes) into styled spans.
 * Only colour and weight are kept; cursor movement and hyperlinks are dropped.
 */

export interface Span {
  text: string;
  /** A CSS colour value, or undefined for the default foreground. */
  color?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const BASIC = ['gray', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'] as const;
const basicColor = (index: number) => `var(--ansi-${BASIC[index] ?? 'white'})`;

function color256(n: number): string | undefined {
  if (n < 8) return basicColor(n);
  if (n < 16) return basicColor(n - 8);
  if (n >= 232) {
    const level = 8 + (n - 232) * 10;
    return `rgb(${level} ${level} ${level})`;
  }
  const cube = n - 16;
  const channel = (value: number) => (value === 0 ? 0 : 55 + value * 40);
  return `rgb(${channel(Math.floor(cube / 36))} ${channel(Math.floor(cube / 6) % 6)} ${channel(cube % 6)})`;
}

type Style = Omit<Span, 'text'>;

function applySgr(style: Style, params: number[]): Style {
  let next = { ...style };
  for (let i = 0; i < params.length; i += 1) {
    const code = params[i]!;
    if (code === 0) next = {};
    else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 22) {
      next.bold = false;
      next.dim = false;
    } else if (code === 23) next.italic = false;
    else if (code === 24) next.underline = false;
    else if (code >= 30 && code <= 37) next.color = basicColor(code - 30);
    else if (code >= 90 && code <= 97) next.color = basicColor(code - 90);
    else if (code === 39) next.color = undefined;
    else if (code === 38 || code === 48) {
      // Extended colour: 38;5;n or 38;2;r;g;b. Backgrounds (48) are skipped.
      const mode = params[i + 1];
      if (mode === 5) {
        if (code === 38) next.color = color256(params[i + 2] ?? 7);
        i += 2;
      } else if (mode === 2) {
        if (code === 38) next.color = `rgb(${params[i + 2] ?? 0} ${params[i + 3] ?? 0} ${params[i + 4] ?? 0})`;
        i += 4;
      }
    }
  }
  return next;
}

/** Progress output redraws a line with \r; keep only what would be left on screen. */
function collapseCarriageReturns(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const last = line.lastIndexOf('\r');
      return last === -1 ? line : line.slice(last + 1);
    })
    .join('\n');
}

// CSI sequences, OSC sequences (terminated by BEL or ESC \), and two-character escapes.
const ESCAPE = /\x1b\[([0-9;?]*)([@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\^_]/g;

export function parseAnsi(raw: string): Span[] {
  const text = collapseCarriageReturns(raw);
  const spans: Span[] = [];
  let style: Style = {};
  let cursor = 0;

  const push = (chunk: string) => {
    if (chunk) spans.push({ text: chunk, ...style });
  };

  for (const match of text.matchAll(ESCAPE)) {
    push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    if (match[2] === 'm') {
      const params = (match[1] ?? '').split(';').map((part) => Number(part || 0));
      style = applySgr(style, params);
    }
  }
  push(text.slice(cursor));
  return spans;
}

export const stripAnsi = (raw: string): string => parseAnsi(raw).map((span) => span.text).join('');
