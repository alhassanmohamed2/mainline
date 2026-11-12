/** Helpers for files that contain git's conflict markers. */

export type Resolution = 'ours' | 'theirs' | 'both';

const START = /^<{7}( |$)/;
const BASE = /^\|{7}( |$)/;
const MIDDLE = /^={7}$/;
const END = /^>{7}( |$)/;

export function countConflicts(text: string): number {
  return text.split('\n').filter((line) => START.test(line)).length;
}

/**
 * Removes the marker lines and keeps the chosen side of every conflict.
 * "ours" is the branch you are on (HEAD); "theirs" is the one being merged in.
 */
export function resolveConflicts(text: string, keep: Resolution): string {
  const output: string[] = [];
  let section: 'outside' | 'ours' | 'base' | 'theirs' = 'outside';

  for (const line of text.split('\n')) {
    if (section === 'outside') {
      if (START.test(line)) section = 'ours';
      else output.push(line);
    } else if (END.test(line)) section = 'outside';
    else if (BASE.test(line)) section = 'base';
    else if (MIDDLE.test(line)) section = 'theirs';
    else if (section === 'ours' && keep !== 'theirs') output.push(line);
    else if (section === 'theirs' && keep !== 'ours') output.push(line);
  }
  return output.join('\n');
}
