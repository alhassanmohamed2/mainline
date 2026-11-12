import { gitStatus, run, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

export const commit: Chapter = {
  id: 'commit',
  number: 2,
  title: 'Stage and commit',
  tagline: 'Move changes through the three trees.',
  color: 'orange',
  intro:
    'Git keeps three versions of your project side by side: the files you are editing, the snapshot you are preparing, and the last snapshot you saved. Almost every everyday command moves content between these three.',
  startingPoint: 'An empty repository: `git init` has run, nothing else.',
  setup: ['git init'],
  requires: { repo: 'present' },
  steps: [
    {
      id: 'untracked',
      title: 'Create a file',
      body: [
        'Create a first file. In real life you would use your editor; here an `echo` command does it so that you can see exactly what was written.',
        'A new file is **untracked**: it exists in your working directory, but git has never been told about it and will not include it in a snapshot on its own.',
      ],
      actions: [writeLine('# Metro Notes', 'README.md', 'create'), gitStatus()],
      notice: [
        'On the board, README.md has a red ticket in the **working directory** column and empty slots in the other two.',
        'The seven characters on the ticket are the start of the id git would give this content. Remember them for the next step.',
        '`git status` lists the file under "Untracked files".',
      ],
      term: {
        name: 'Working directory',
        text: 'The actual files on disk that you open and edit. Git compares them against what it has stored.',
      },
    },
    {
      id: 'stage',
      title: 'Stage it',
      body: [
        '`git add` copies the current content of a file into the **staging area** (git also calls it the index). The staging area is the draft of your next commit.',
        'Staging is a separate step so that you choose what goes into each commit. You can edit ten files and commit three of them.',
      ],
      actions: [
        run('git add README.md', [
          ['git add', 'Copies content from the working directory into the staging area.'],
          ['README.md', 'Which file to stage. `git add .` would stage every change in the current folder.'],
        ]),
        gitStatus(),
      ],
      notice: [
        'A green ticket appeared in the **staging area** column, with the same id as the working copy: both columns now hold identical content.',
        'Under the hood, the object count went up by one. Git already stored the file\'s content when you staged it.',
        '`git status` now lists the file under "Changes to be committed".',
      ],
      term: {
        name: 'Staging area (index)',
        text: 'The snapshot being assembled for the next commit. `git add` puts content in; `git commit` saves it.',
      },
    },
    {
      id: 'first-commit',
      title: 'Commit it',
      body: [
        '`git commit` saves the staging area as a permanent snapshot. Along with the files it records who made it, when, a message, and which commit came before.',
        'Write the message for someone reading the history a year from now. A good first line completes the sentence "this commit will…".',
      ],
      actions: [
        run('git commit -m "Start the metro notes"', [
          ['git commit', 'Turns the staging area into a new commit and moves the current branch to it.'],
          ['-m', 'Supplies the message on the command line. Without it git opens a text editor for you to write one.'],
          ['"Start the metro notes"', 'The commit message. The quotes keep the words together as one value.'],
        ]),
      ],
      notice: [
        'The first station appears on the line map, labelled `main` and `HEAD`.',
        'All three columns on the board show the same id: working directory, staging area and last commit agree, so the tree is "clean".',
        'Git printed `root-commit`: this commit has no parent because it is the first.',
      ],
      term: {
        name: 'Commit',
        text: 'A saved snapshot of the whole project plus author, date, message and a link to its parent commit.',
      },
    },
    {
      id: 'modify',
      title: 'Change a tracked file',
      body: [
        'README.md is now **tracked**: git remembers a version of it. Change the file and git can tell you precisely what is different.',
        '`git diff` with no arguments compares the working directory against the staging area. It answers "what have I changed that I have not staged yet?".',
      ],
      actions: [
        writeLine("A pocket guide to the city's metro lines.", 'README.md', 'append'),
        run('git diff', [
          ['git diff', 'Shows line-by-line differences. With nothing after it: working directory compared to the staging area.'],
        ]),
      ],
      notice: [
        'The working directory ticket turned red and says "modified". Its id changed; the other two columns still hold the old id.',
        'In the diff, the line starting with `+` is the line you added. Lines without a sign are unchanged context.',
      ],
    },
    {
      id: 'selective',
      title: 'Commit only part of your work',
      body: [
        'Add a second file while README.md is still modified. You now have two unrelated changes in progress.',
        'Stage only `lines.txt` and commit. The commit takes exactly what is in the staging area and ignores everything else, so the README change stays behind, untouched, waiting.',
      ],
      actions: [
        writeLine('Red Line: Airport - Central - Harbor', 'lines.txt', 'create'),
        run('git add lines.txt', [
          ['git add', 'Copies content from the working directory into the staging area.'],
          ['lines.txt', 'Only this file. README.md is deliberately left out.'],
        ]),
        run('git diff --staged', [
          ['git diff', 'Shows line-by-line differences.'],
          ['--staged', 'Compares the staging area against the last commit instead: "what exactly am I about to commit?". `--cached` is an older name for the same option.'],
        ]),
        run('git commit -m "Add the Red Line"', [
          ['git commit', 'Saves the staging area as a new commit.'],
          ['-m "Add the Red Line"', 'The message for this commit.'],
        ]),
      ],
      notice: [
        'A second station appears on the line map, connected to the first. That connection is the parent link.',
        'On the board, lines.txt is identical in all three columns, while README.md is still red in the working directory.',
      ],
    },
    {
      id: 'commit-all',
      title: 'Stage and commit in one go',
      body: [
        'For files git already tracks, `-a` lets you skip the separate `git add`. It stages every modified or deleted tracked file and then commits.',
        'It does **not** pick up new, untracked files. Those always need an explicit `git add` first.',
      ],
      actions: [
        run('git commit -am "Describe the project"', [
          ['git commit', 'Saves a new commit.'],
          ['-a', 'First stage every tracked file that has changed. New files are not included.'],
          ['-m "Describe the project"', 'The message. Single-letter options can be combined, so `-a -m` becomes `-am`.'],
        ]),
      ],
      notice: [
        'README.md went from the working directory through the staging area into the commit in one step.',
        'The board is clean again: every file has the same id in all three columns.',
      ],
    },
    {
      id: 'ignore',
      title: 'Keep files out of git',
      body: [
        'Some files should never be committed: build output, editor backups, passwords. List patterns for them in a file called `.gitignore` and git stops mentioning them.',
        'The `.gitignore` file is itself a normal tracked file. You commit it so that everyone working on the project ignores the same things.',
      ],
      actions: [
        writeLine('rough notes, not for sharing', 'scratch.tmp', 'create'),
        gitStatus(),
        writeLine('*.tmp', '.gitignore', 'create'),
        gitStatus(),
        run('git add .gitignore', [
          ['git add', 'Copies content into the staging area.'],
          ['.gitignore', 'The ignore rules themselves are committed like any other file.'],
        ]),
        run('git commit -m "Ignore temporary files"', [
          ['git commit', 'Saves the staging area as a new commit.'],
          ['-m "Ignore temporary files"', 'The message.'],
        ]),
      ],
      notice: [
        'The first `git status` lists scratch.tmp as untracked. The second one does not mention it at all.',
        'On the board, scratch.tmp is greyed out and marked "ignored". It is still on disk; git just looks past it.',
      ],
      term: {
        name: '.gitignore',
        text: 'A list of file patterns git should leave untracked. `*.tmp` matches every file ending in .tmp.',
      },
    },
  ],
};
