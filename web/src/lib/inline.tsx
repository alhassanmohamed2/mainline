import type { ReactNode } from 'react';

const MARKUP = /(`[^`]+`|\*\*[^*]+\*\*)/g;

/** Renders lesson text: `code` becomes inline code, **text** becomes strong. */
export function inline(text: string): ReactNode[] {
  return text.split(MARKUP).map((piece, index) => {
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 2) {
      const code = piece.slice(1, -1);
      return (
        <code key={index} className={`prose-code${code.length > 28 ? ' prose-code-wrap' : ''}`}>
          {code}
        </code>
      );
    }
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }
    return piece;
  });
}
