/**
 * A deliberately small command-line reader. It understands quoting the way a
 * shell does, but nothing is ever handed to a shell: the words become an
 * argument list for exactly one program.
 */

export type Token = { type: 'word'; value: string } | { type: 'op'; value: string };

export class CommandSyntaxError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

const OPERATOR_CHARS = new Set(['|', '&', ';', '<', '>', '(', ')']);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let word = '';
  let inWord = false;
  let i = 0;

  const pushWord = () => {
    if (inWord) tokens.push({ type: 'word', value: word });
    word = '';
    inWord = false;
  };

  const noExpansion = (char: string) =>
    new CommandSyntaxError(
      char === '`' || input[i + 1] === '('
        ? 'Command substitution is not supported here.'
        : 'Shell variables are not supported here.',
      `Put the text in single quotes to use a literal "${char}".`,
    );

  while (i < input.length) {
    const char = input[i]!;

    if (char === "'") {
      const end = input.indexOf("'", i + 1);
      if (end === -1) throw new CommandSyntaxError('Unclosed single quote.', "Add the closing ' to finish the text.");
      word += input.slice(i + 1, end);
      inWord = true;
      i = end + 1;
      continue;
    }

    if (char === '"') {
      i += 1;
      let closed = false;
      while (i < input.length) {
        const inner = input[i]!;
        if (inner === '"') {
          closed = true;
          break;
        }
        if (inner === '\\' && i + 1 < input.length && '"\\$`'.includes(input[i + 1]!)) {
          word += input[i + 1];
          i += 2;
          continue;
        }
        if (inner === '$' || inner === '`') throw noExpansion(inner);
        word += inner;
        i += 1;
      }
      if (!closed) throw new CommandSyntaxError('Unclosed double quote.', 'Add the closing " to finish the text.');
      inWord = true;
      i += 1;
      continue;
    }

    if (char === '\\') {
      if (i + 1 >= input.length) throw new CommandSyntaxError('A command cannot end with a backslash.');
      word += input[i + 1];
      inWord = true;
      i += 2;
      continue;
    }

    if (char === '$' || char === '`') throw noExpansion(char);

    if (/\s/.test(char)) {
      pushWord();
      i += 1;
      continue;
    }

    if (char === '#' && !inWord) break; // rest of the line is a comment

    if (OPERATOR_CHARS.has(char)) {
      pushWord();
      const pair = input.slice(i, i + 2);
      const value = pair === '>>' || pair === '&&' || pair === '||' ? pair : char;
      tokens.push({ type: 'op', value });
      i += value.length;
      continue;
    }

    word += char;
    inWord = true;
    i += 1;
  }

  pushWord();
  return tokens;
}
