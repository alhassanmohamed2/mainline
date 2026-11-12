import type { Anatomy, EditAction, RunAction } from './types.ts';

type Part = [part: string, note: string];

const toAnatomy = (parts: Part[]): Anatomy[] => parts.map(([part, note]) => ({ part, note }));

/** Mirrors the server's policy closely enough to warn before the click. The server decides. */
const CHANGES_REMOTE = /^(git push\b|gh (repo (create|delete)|issue create|pr (create|merge)|release create|api -X (PUT|POST|PATCH|DELETE)))/;

/** A command the learner runs. `parts` explains the command line piece by piece. */
export function run(command: string, parts: Part[]): RunAction {
  return { kind: 'run', run: command, anatomy: toAnatomy(parts), changesRemote: CHANGES_REMOTE.test(command) };
}

/** A command whose error message is the lesson. */
export function runExpectingFailure(command: string, parts: Part[]): RunAction {
  return { ...run(command, parts), failsOnPurpose: true };
}

export function edit(file: string, goal: string, solution: string): EditAction {
  return { kind: 'edit', file, goal, solution };
}

/* Commands that appear in many chapters, explained once. */

export const gitStatus = () =>
  run('git status', [
    ['git', 'The program. Everything after it tells git what to do.'],
    ['status', 'Compares the three trees (working directory, staging area, last commit) and reports every difference. It never changes anything.'],
  ]);

export const gitLogOneline = () =>
  run('git log --oneline', [
    ['git log', 'Walks backwards from HEAD through each commit\'s parent and prints them, newest first.'],
    ['--oneline', 'One line per commit: the shortened commit id, then the first line of its message.'],
  ]);

export const catFile = (file: string) =>
  run(`cat ${file}`, [
    ['cat', 'Prints a file. A Mainline file helper, not a git command.'],
    [file, 'The file in your working directory, exactly as it is on disk right now.'],
  ]);

/** `echo "text" > file` or `echo "text" >> file`. */
export function writeLine(text: string, file: string, mode: 'create' | 'append'): RunAction {
  const operator = mode === 'create' ? '>' : '>>';
  return run(`echo "${text}" ${operator} ${file}`, [
    ['echo "…"', 'Produces a line of text. This is a Mainline file helper standing in for your editor; it is not a git command.'],
    [
      `${operator} ${file}`,
      mode === 'create'
        ? `Writes that line into ${file}, creating the file (or replacing its content).`
        : `Appends that line to the end of ${file}, keeping what is already there.`,
    ],
  ]);
}

/** The four commits most chapters start from. */
export const baseHistory: string[] = [
  'git init',
  'echo "# Metro Notes" > README.md',
  'git add README.md',
  'git commit -m "Start the metro notes"',
  'echo "Red Line: Airport - Central - Harbor" > lines.txt',
  'git add lines.txt',
  'git commit -m "Add the Red Line"',
  'echo "A pocket guide to the city\'s metro lines." >> README.md',
  'git commit -am "Describe the project"',
  'echo "*.tmp" > .gitignore',
  'git add .gitignore',
  'git commit -m "Ignore temporary files"',
];

export const BASE_STARTING_POINT =
  'A repository with four commits on main: README.md, lines.txt and .gitignore.';
