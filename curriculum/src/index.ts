import { create } from './chapters/01-create.ts';
import { commit } from './chapters/02-commit.ts';
import { history } from './chapters/03-history.ts';
import { undo } from './chapters/04-undo.ts';
import { branch } from './chapters/05-branch.ts';
import { rewrite } from './chapters/06-rewrite.ts';
import { github } from './chapters/07-github.ts';
import { collaborate } from './chapters/08-collaborate.ts';
import type { Chapter } from './types.ts';

export type * from './types.ts';

export const chapters: Chapter[] = [create, commit, history, undo, branch, rewrite, github, collaborate];

/** Values that only exist at run time, filled into {{placeholders}} in commands. */
export interface TemplateValues {
  ghUser: string | null;
  repoName: string;
}

export function fillTemplate(command: string, values: TemplateValues): string {
  return command
    .replaceAll('{{repoName}}', values.repoName)
    .replaceAll('{{ghUser}}', values.ghUser ?? 'YOUR-GITHUB-NAME');
}
