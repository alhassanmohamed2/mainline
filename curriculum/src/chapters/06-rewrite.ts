import { baseHistory, catFile, gitStatus, run, runExpectingFailure, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

const graphAll = () =>
  run('git log --oneline --graph --all', [
    ['git log --oneline', 'Compact list of commits.'],
    ['--graph', 'Draw the parent links as lines.'],
    ['--all', 'Start from every branch and tag, not only from HEAD.'],
  ]);

export const rewrite: Chapter = {
  id: 'rewrite',
  number: 6,
  title: 'Stash, rebase, pick and tag',
  tagline: 'Shelve work, replay commits, copy one, and mark a release.',
  color: 'blue',
  intro:
    'Four tools for shaping history rather than just adding to it. Each one is easier to understand when you watch the stations move, so keep an eye on the line map.',
  startingPoint:
    'Three branches: main, timetable (two commits ahead, and you are on it) and experiments (two commits ahead).',
  setup: [
    ...baseHistory,
    'git switch -c experiments',
    'echo "The Red Line also stops at Museum." >> lines.txt',
    'git commit -am "Add the Museum stop to the Red Line"',
    'echo "Zone map: a sketch, not finished" > zones.md',
    'git add zones.md',
    'git commit -m "Sketch a zone map"',
    'git switch main',
    'git switch -c timetable',
    'echo "Weekdays: every 5 minutes, 05:00-00:30" > timetable.md',
    'git add timetable.md',
    'git commit -m "Add the weekday timetable"',
    'echo "Weekends: every 10 minutes, 06:00-01:00" >> timetable.md',
    'git commit -am "Add the weekend timetable"',
    'git switch main',
    'echo "Tickets are valid for 90 minutes." >> README.md',
    'git commit -am "Explain ticket validity"',
    'git switch timetable',
  ],
  requires: { branches: ['timetable', 'experiments'] },
  steps: [
    {
      id: 'stash',
      title: 'Shelve unfinished work',
      body: [
        'You are halfway through an edit and need a clean working directory, perhaps to look at another branch or pull an update. The edit is not ready to be committed.',
        '`git stash` saves your uncommitted changes on a shelf and restores the files to the last commit. Nothing is lost; it is just out of the way.',
      ],
      actions: [
        writeLine('Holidays: to be decided', 'timetable.md', 'append'),
        gitStatus(),
        run('git stash', [
          ['git stash', 'Saves staged and unstaged changes to tracked files as a stash entry, then resets the files to the last commit.'],
        ]),
        run('git stash list', [
          ['git stash', 'Works with the stash.'],
          ['list', 'Shows every stash entry. The newest is stash@{0}.'],
        ]),
      ],
      notice: [
        'The red ticket on timetable.md disappears: the working directory is clean.',
        'A "stash" shelf appears under the board with one entry on it.',
      ],
      term: {
        name: 'Stash',
        text: 'A stack of saved, uncommitted changes. Useful for short interruptions; for anything longer, commit on a branch.',
      },
    },
    {
      id: 'stash-pop',
      title: 'Take it back off the shelf',
      body: [
        '`git stash pop` re-applies the newest stash entry to your working directory and removes it from the shelf. Then finish the work and commit it normally.',
      ],
      actions: [
        run('git stash pop', [
          ['git stash', 'Works with the stash.'],
          ['pop', 'Apply the newest entry and delete it from the stash. `git stash apply` would apply it and keep the entry.'],
        ]),
        run('git commit -am "Note the holiday timetable"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Note the holiday timetable"', 'The message.'],
        ]),
      ],
      notice: [
        'The red ticket is back, the shelf is empty, and after the commit `timetable` is three stations ahead of the fork.',
      ],
    },
    {
      id: 'rebase',
      title: 'Rebase onto main',
      body: [
        '`timetable` forked from `main` before the "ticket validity" commit, so the two have diverged. A merge would join them with a merge commit. A **rebase** produces a straight line instead.',
        'Rebasing takes your branch\'s commits, one by one, and re-creates them on top of another commit. The content of each change is the same, but each gets a new parent and therefore a **new id**. The originals are abandoned.',
        'Because it replaces commits, rebase only branches that nobody else is building on.',
      ],
      actions: [
        graphAll(),
        run('git rebase main', [
          ['git rebase', 'Re-creates the commits of the current branch on top of another commit.'],
          ['main', 'The new base. Every commit that timetable has and main lacks is replayed after main\'s newest commit.'],
        ]),
        graphAll(),
      ],
      notice: [
        'The three timetable stations jump to sit after `main`, each with a new id.',
        'The three original commits remain as grey ghosts where they used to be.',
        'The fork between main and timetable is gone: the history is one straight line.',
      ],
      term: {
        name: 'Rebase',
        text: 'Replaying commits onto a new base. Gives a linear history at the price of new commit ids.',
      },
    },
    {
      id: 'ff-after-rebase',
      title: 'Merge the rebased branch',
      body: [
        'After the rebase, `timetable` contains everything `main` has plus three commits. That is exactly the situation where a merge can fast-forward.',
        'Rebase first, then fast-forward merge: this is how many teams keep `main` free of merge commits.',
      ],
      actions: [
        run('git switch main', [
          ['git switch', 'Moves HEAD to another branch.'],
          ['main', 'The branch that should receive the work.'],
        ]),
        run('git merge timetable', [
          ['git merge', 'Brings another branch into the current one.'],
          ['timetable', 'It is directly ahead of main, so main is fast-forwarded.'],
        ]),
      ],
      notice: [
        '`main` slides forward three stations to join `timetable`. No merge commit was needed.',
      ],
    },
    {
      id: 'cherry-pick',
      title: 'Copy a single commit',
      body: [
        'The `experiments` branch has two commits: a useful fix (the Museum stop) and an unfinished sketch. You want the fix on `main` now, without the sketch.',
        '`git cherry-pick` copies the change made by one commit and applies it as a new commit on your current branch.',
      ],
      actions: [
        run('git log --oneline experiments', [
          ['git log --oneline', 'Compact list of commits.'],
          ['experiments', 'Start from this branch instead of HEAD.'],
        ]),
        run('git cherry-pick experiments~1', [
          ['git cherry-pick', 'Applies the change introduced by a commit on top of the current branch, as a new commit.'],
          ['experiments~1', 'One step back from the tip of experiments: the Museum stop commit.'],
        ]),
        catFile('lines.txt'),
      ],
      notice: [
        'A new station appears on `main` with the same message as the picked commit but a different id.',
        'The original still sits on `experiments`. Cherry-pick copies; it does not move.',
      ],
      term: {
        name: 'Cherry-pick',
        text: 'Copying one commit\'s change onto another branch. The copy is a separate commit with its own id.',
      },
    },
    {
      id: 'tag',
      title: 'Mark a release',
      body: [
        'A **tag** is a name for a commit that never moves. Branches advance as you commit; a tag stays put. Tags are how releases are marked.',
        'An annotated tag (`-a`) is a full object with its own author, date and message. That is the kind to use for releases.',
      ],
      actions: [
        run('git tag -a v1.0 -m "First public edition"', [
          ['git tag', 'Creates, lists or deletes tags.'],
          ['-a', 'Make an annotated tag: a real object in the database with its own metadata.'],
          ['v1.0', 'The tag name. It points at the current commit.'],
          ['-m "First public edition"', 'The tag message.'],
        ]),
        run('git tag', [
          ['git tag', 'With nothing after it: list all tags.'],
        ]),
        run('git show v1.0 --stat', [
          ['git show', 'Prints one object.'],
          ['v1.0', 'For an annotated tag: the tag details first, then the commit it points at.'],
          ['--stat', 'Summarise the commit\'s changes as a file list instead of a full diff.'],
        ]),
      ],
      notice: [
        'A `v1.0` label is attached to the newest station. Make another commit later and the tag will stay behind on this one.',
      ],
      term: {
        name: 'Tag',
        text: 'A permanent name for one commit, typically a version number.',
      },
    },
    {
      id: 'force-delete',
      title: 'Delete an unmerged branch',
      body: [
        'The sketch on `experiments` is not going anywhere. Try to delete the branch the careful way first and read what git says.',
        'Then force it. The commits that only `experiments` could reach become unreachable. They are not erased immediately: the reflog protects them for a while, and after that git\'s garbage collection removes them.',
      ],
      actions: [
        runExpectingFailure('git branch -d experiments', [
          ['git branch -d', 'Delete a branch, but only if its commits are merged.'],
          ['experiments', 'It has commits that exist nowhere else, so git refuses.'],
        ]),
        run('git branch -D experiments', [
          ['git branch', 'Manages branches.'],
          ['-D', 'Delete the branch even though it is not merged.'],
          ['experiments', 'The branch to remove.'],
        ]),
        run('git branch -d timetable', [
          ['git branch -d', 'Delete a merged branch.'],
          ['timetable', 'Fully contained in main, so this is allowed.'],
        ]),
      ],
      notice: [
        'The first command fails with "not fully merged" and suggests `-D`.',
        'After the forced delete, the two experiments stations turn into ghosts.',
      ],
    },
  ],
};
