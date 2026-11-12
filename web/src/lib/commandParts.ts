/** Splits a command line into coloured pieces for display. Not used to run anything. */

export type PartKind = 'program' | 'verb' | 'flag' | 'string' | 'operator' | 'argument';

export interface CommandPart {
  text: string;
  kind: PartKind;
}

const WORD = /"[^"]*"|'[^']*'|>>|>|\S+/g;

export function commandParts(command: string): CommandPart[] {
  const words = command.match(WORD) ?? [];
  let seenVerb = false;
  return words.map((text, index) => {
    if (index === 0) return { text, kind: 'program' };
    if (text === '>' || text === '>>') return { text, kind: 'operator' };
    if (text.startsWith('"') || text.startsWith("'")) return { text, kind: 'string' };
    if (text.startsWith('-')) return { text, kind: 'flag' };
    if (!seenVerb && (words[0] === 'git' || words[0] === 'gh')) {
      seenVerb = true;
      return { text, kind: 'verb' };
    }
    return { text, kind: 'argument' };
  });
}
