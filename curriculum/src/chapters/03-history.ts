import { BASE_STARTING_POINT, baseHistory, gitLogOneline, run } from '../builders.ts';
import type { Chapter } from '../types.ts';

export const history: Chapter = {
  id: 'history',
  number: 3,
  title: 'Read the history',
  tagline: 'Find out what changed, when, and in which commit.',
  color: 'yellow',
  intro:
    'A repository is only useful if you can read it back. These commands change nothing; they are different ways of looking at the commits you already have.',
  startingPoint: BASE_STARTING_POINT,
  setup: baseHistory,
  requires: { files: ['README.md', 'lines.txt'] },
  steps: [
    {
      id: 'log',
      title: 'List the commits',
      body: [
        '`git log` starts at HEAD and follows parent links backwards, printing each commit on the way. That is all "history" is: a chain of commits, each pointing at the one before.',
        'The long string after `commit` is the commit id: a 40-character checksum of everything in the commit. Change one byte of content, message or date and the id is different.',
      ],
      actions: [
        run('git log', [
          ['git log', 'Prints commits reachable from HEAD, newest first, each with id, author, date and message.'],
        ]),
      ],
      notice: [
        'Four commits, the same four stations as on the line map.',
        'The newest one is marked `(HEAD -> main)`: HEAD points at the branch main, and main points at this commit.',
      ],
      term: {
        name: 'Commit id (SHA)',
        text: 'A checksum that names a commit. The first seven characters are almost always enough to refer to it.',
      },
    },
    {
      id: 'log-compact',
      title: 'Get an overview',
      body: [
        'The full log is long. Options shape it into what you need: a compact list, a limited number of commits, or a summary of the files each one touched.',
      ],
      actions: [
        gitLogOneline(),
        run('git log -2 --stat', [
          ['git log', 'Prints commits, newest first.'],
          ['-2', 'Stop after two commits. Any number works.'],
          ['--stat', 'Under each commit, list the files it changed and how many lines were added (+) or removed (-).'],
        ]),
      ],
      notice: [
        'The short ids in the one-line log match the ids on the line map stations.',
      ],
    },
    {
      id: 'show',
      title: 'Open one commit',
      body: [
        '`git show` prints a single commit: its details followed by the changes it introduced compared with its parent.',
        'You rarely type ids. `HEAD` means the current commit, `HEAD~1` its parent, `HEAD~2` the one before that. These relative names work anywhere a commit is expected.',
      ],
      actions: [
        run('git show HEAD', [
          ['git show', 'Prints one object. For a commit: author, date, message, then the diff against its parent.'],
          ['HEAD', 'The commit you are on right now.'],
        ]),
        run('git show HEAD~2', [
          ['git show', 'Prints one commit and its changes.'],
          ['HEAD~2', 'Two steps back from HEAD along the parent links: here, "Add the Red Line".'],
        ]),
      ],
      notice: [
        'Click a station on the line map to see the same details there, and compare the ids.',
        'The second commit shows lines.txt as a `new file`: that commit is where the file first appeared.',
      ],
    },
    {
      id: 'diff-commits',
      title: 'Compare two points in time',
      body: [
        'Give `git diff` two commits and it shows everything that changed between them, no matter how many commits lie in between.',
        'Add `--` and a path to narrow the comparison to one file. The `--` tells git "what follows are file names, not commits".',
      ],
      actions: [
        run('git diff HEAD~2 HEAD', [
          ['git diff', 'Shows line-by-line differences between two snapshots.'],
          ['HEAD~2', 'The older side of the comparison.'],
          ['HEAD', 'The newer side. Lines marked + exist here but not in the older snapshot.'],
        ]),
        run('git diff HEAD~3 HEAD -- README.md', [
          ['git diff HEAD~3 HEAD', 'Compares the first commit with the current one.'],
          ['--', 'Separates commits from file names.'],
          ['README.md', 'Limit the output to this file.'],
        ]),
      ],
      notice: [
        'The first diff covers two commits at once: the README description and the new .gitignore.',
      ],
    },
    {
      id: 'file-history',
      title: 'Follow one file',
      body: [
        'Two questions come up all the time: "which commits touched this file?" and "who last changed this line?".',
        '`git log -- <file>` answers the first. `git blame` answers the second by printing, next to every line, the commit that last changed it.',
      ],
      actions: [
        run('git log --oneline -- README.md', [
          ['git log --oneline', 'Compact list of commits.'],
          ['-- README.md', 'Only commits that changed this file.'],
        ]),
        run('git blame README.md', [
          ['git blame', 'For each line of a file: the commit, author and date that last changed it.'],
          ['README.md', 'The file to annotate.'],
        ]),
      ],
      notice: [
        'Only two of the four commits changed README.md.',
        'In the blame output the two lines carry different commit ids, because they were written in different commits.',
      ],
    },
    {
      id: 'objects',
      title: 'See what a commit is made of',
      body: [
        'Git stores four kinds of object. A **blob** is the content of one file. A **tree** is a folder listing: names mapped to blobs and other trees. A **commit** points at one tree and at its parent commits. (The fourth, an annotated tag, comes in chapter 6.)',
        '`git cat-file` reads objects straight from the database. Follow the chain: commit, to tree, to blob.',
      ],
      actions: [
        run('git cat-file -t HEAD', [
          ['git cat-file', 'A low-level command that reads one object from the database.'],
          ['-t', 'Print only the type of the object.'],
          ['HEAD', 'The object to look up.'],
        ]),
        run('git cat-file -p HEAD', [
          ['git cat-file', 'Reads one object from the database.'],
          ['-p', 'Pretty-print the content of the object.'],
          ['HEAD', 'The current commit.'],
        ]),
        run('git cat-file -p HEAD^{tree}', [
          ['git cat-file -p', 'Pretty-print an object.'],
          ['HEAD^{tree}', 'The tree that the commit HEAD points at: the snapshot of the top-level folder.'],
        ]),
        run('git cat-file -p HEAD:README.md', [
          ['git cat-file -p', 'Pretty-print an object.'],
          ['HEAD:README.md', 'The blob stored for README.md in the commit HEAD. The form is commit:path.'],
        ]),
      ],
      notice: [
        'The commit contains a `tree` line, a `parent` line, author, committer and the message. Nothing else.',
        'The tree lists three blobs. Their ids start with the same seven characters shown in the **last commit** column of the board.',
      ],
      term: {
        name: 'Blob, tree, commit',
        text: 'File content, folder listing, and snapshot-with-history. Each is named by the checksum of its content.',
      },
    },
    {
      id: 'detached',
      title: 'Visit an old commit',
      body: [
        'You can put any commit back into your working directory. `git switch --detach` moves HEAD directly onto a commit instead of onto a branch. Git calls this a **detached HEAD**.',
        'It is a safe way to look around. Your files change to match the old snapshot and nothing is lost: `main` still points at the newest commit. Switch back to it when you are done.',
      ],
      actions: [
        run('git switch --detach HEAD~2', [
          ['git switch', 'Moves HEAD somewhere else and updates the working directory to match.'],
          ['--detach', 'Point HEAD at the commit itself rather than at a branch.'],
          ['HEAD~2', 'The commit to visit: two steps back.'],
        ]),
        run('ls -a', [
          ['ls -a', 'Lists the files in the playground, including hidden ones.'],
        ]),
        run('git switch main', [
          ['git switch', 'Moves HEAD and updates the working directory.'],
          ['main', 'The branch to return to. HEAD is attached to a branch again.'],
        ]),
      ],
      notice: [
        'While detached, the `HEAD` marker on the line map sits on an older station while `main` stays at the newest.',
        '.gitignore vanishes from the folder and the board, because it did not exist yet in that commit. It returns when you switch back.',
        'Under the hood, the HEAD file holds a raw commit id while detached, and `ref: refs/heads/main` afterwards.',
      ],
      term: {
        name: 'Detached HEAD',
        text: 'HEAD points at a commit directly. Fine for looking; commits made here belong to no branch until you create one.',
      },
    },
  ],
};
