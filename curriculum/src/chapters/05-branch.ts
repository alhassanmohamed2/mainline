import { BASE_STARTING_POINT, baseHistory, catFile, edit, gitStatus, run, runExpectingFailure, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

const switchTo = (branch: string, note: string) =>
  run(`git switch ${branch}`, [
    ['git switch', 'Moves HEAD to another branch and updates the working directory to match its snapshot.'],
    [branch, note],
  ]);

const RESOLVED_LINES = [
  'Red Line: Airport - Central - Harbor',
  'Night Line: Central - Old Town - Riverside (00:30-05:00)',
  'Green Line: Park - Central - Market',
  'Tram T1: Harbor - Old Town',
  'Express: Airport - Central (non-stop)',
  '',
].join('\n');

export const branch: Chapter = {
  id: 'branch',
  number: 5,
  title: 'Branch and merge',
  tagline: 'Work on several things at once, then bring them together.',
  color: 'teal',
  intro:
    'A branch lets you try something without disturbing the main line of work. In git a branch costs nothing: it is a name that points at a commit and moves forward when you commit. This chapter creates branches, merges them three different ways, and resolves a conflict.',
  startingPoint: BASE_STARTING_POINT,
  setup: baseHistory,
  requires: { files: ['README.md', 'lines.txt'] },
  steps: [
    {
      id: 'create-branch',
      title: 'Create a branch',
      body: [
        'Creating a branch writes one small file containing a commit id. No files are copied and nothing about your project changes.',
        'The new branch points at the commit you are on. You are still on `main`: creating a branch does not move you onto it.',
      ],
      actions: [
        run('git branch night-line', [
          ['git branch', 'Manages branches. With a name after it: create a branch.'],
          ['night-line', 'The name of the new branch. It starts at the current commit.'],
        ]),
        run('git branch', [
          ['git branch', 'With nothing after it: list local branches. The current one is marked with *.'],
        ]),
        catFile('.git/refs/heads/night-line'),
      ],
      notice: [
        'The newest station on the line map now carries two labels: `main` and `night-line`. `HEAD` is still attached to main.',
        'The file `.git/refs/heads/night-line` holds a 40-character commit id and nothing else. That file is the branch.',
      ],
      term: {
        name: 'Branch',
        text: 'A movable name for a commit. Committing while on a branch moves that name forward to the new commit.',
      },
    },
    {
      id: 'switch',
      title: 'Switch to it',
      body: [
        '`git switch` moves HEAD to another branch. From now on, new commits advance `night-line` and leave `main` where it is.',
        'To create and switch in one step, use `git switch -c <name>`. Older tutorials use `git checkout -b <name>`, which does the same.',
      ],
      actions: [switchTo('night-line', 'The branch to move onto. HEAD now names this branch.')],
      notice: [
        'The `HEAD` marker moved from `main` to `night-line`. Both still sit on the same station.',
        'Under the hood, the HEAD file changed to `ref: refs/heads/night-line`.',
      ],
    },
    {
      id: 'commit-on-branch',
      title: 'Commit on the branch',
      body: [
        'Make two commits. Each one advances the branch you are on and nothing else.',
      ],
      actions: [
        writeLine('Night Line: Central - Old Town - Riverside (00:30-05:00)', 'lines.txt', 'append'),
        run('git commit -am "Add the Night Line"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add the Night Line"', 'The message.'],
        ]),
        writeLine('The Night Line runs every 20 minutes.', 'night.md', 'create'),
        run('git add night.md', [
          ['git add', 'Copies content into the staging area.'],
          ['night.md', 'A new file, so it must be added explicitly.'],
        ]),
        run('git commit -m "Document the night service"', [
          ['git commit', 'Saves the staging area as a new commit.'],
          ['-m "Document the night service"', 'The message.'],
        ]),
      ],
      notice: [
        '`night-line` is now two stations ahead. `main` has not moved.',
      ],
    },
    {
      id: 'fast-forward',
      title: 'Merge by fast-forward',
      body: [
        'Go back to `main` and merge the branch. `git merge` always works in the same direction: it brings the named branch **into the branch you are on**.',
        'Since `main` has no commits of its own after the point where `night-line` started, there is nothing to combine. Git moves the `main` label forward to the same commit. This is a **fast-forward**, and it creates no new commit.',
      ],
      actions: [
        switchTo('main', 'Back to main. The working directory changes to main\'s snapshot.'),
        run('git merge night-line', [
          ['git merge', 'Brings the changes of another branch into the current one.'],
          ['night-line', 'The branch to merge in. The current branch (main) is the one that changes.'],
        ]),
      ],
      notice: [
        'After switching to main, night.md disappears from the folder and the board: it does not exist in main\'s snapshot yet.',
        'After the merge, the `main` label slides two stations forward to join `night-line`, and night.md is back. Git printed `Fast-forward`.',
      ],
      term: {
        name: 'Fast-forward',
        text: 'A merge where the current branch is simply moved forward, because it had no new commits of its own.',
      },
    },
    {
      id: 'diverge',
      title: 'Let two branches diverge',
      body: [
        'Now make history fork. Create a branch, commit on it, then go back and commit on `main` too.',
        'After this, each branch has a commit the other one lacks. Neither can be fast-forwarded to the other.',
      ],
      actions: [
        run('git switch -c green-line', [
          ['git switch', 'Moves HEAD to another branch.'],
          ['-c', 'Create the branch first, then switch to it.'],
          ['green-line', 'The name of the new branch.'],
        ]),
        writeLine('Green Line: Park - Central - Market', 'lines.txt', 'append'),
        run('git commit -am "Add the Green Line"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add the Green Line"', 'The message.'],
        ]),
        switchTo('main', 'Back to main, which does not have the Green Line commit.'),
        writeLine('Tickets are valid for 90 minutes.', 'README.md', 'append'),
        run('git commit -am "Explain ticket validity"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Explain ticket validity"', 'The message.'],
        ]),
      ],
      notice: [
        'The line map splits into two tracks: `green-line` on one, `main` on the other. They share every station up to the fork.',
      ],
    },
    {
      id: 'merge-commit',
      title: 'Merge diverged branches',
      body: [
        'Merge `green-line` into `main`. Git finds the commit where the two branches split, works out what each side changed since then, and applies both sets of changes.',
        'The result is saved as a **merge commit**: a commit with two parents, one on each branch. The two sides touched different files here, so git can combine them without asking you anything.',
      ],
      actions: [
        run('git merge green-line', [
          ['git merge', 'Brings the changes of another branch into the current one.'],
          ['green-line', 'The branch to merge in. Because both branches have new commits, git creates a merge commit.'],
        ]),
        run('git log --oneline --graph', [
          ['git log --oneline', 'Compact list of commits.'],
          ['--graph', 'Draw the parent links as lines on the left, so forks and merges are visible.'],
        ]),
      ],
      notice: [
        'The two tracks on the line map join in a new station with two lines running into it.',
        'README.md has the ticket sentence and lines.txt has the Green Line: both changes are present.',
      ],
      term: {
        name: 'Merge commit',
        text: 'A commit with more than one parent. It records that two lines of work were joined, and how.',
      },
    },
    {
      id: 'conflict',
      title: 'Cause a conflict',
      body: [
        'Git combines changes automatically as long as the two sides changed different parts. When both sides change the **same lines**, it cannot know which version you want, and it stops and asks.',
        'Set that up on purpose: add a different line at the end of lines.txt on each branch, then merge.',
      ],
      actions: [
        run('git switch -c express', [
          ['git switch -c', 'Create a branch and switch to it.'],
          ['express', 'The name of the new branch.'],
        ]),
        writeLine('Express: Airport - Central (non-stop)', 'lines.txt', 'append'),
        run('git commit -am "Add the Express"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add the Express"', 'The message.'],
        ]),
        switchTo('main', 'Back to main.'),
        writeLine('Tram T1: Harbor - Old Town', 'lines.txt', 'append'),
        run('git commit -am "Add tram T1"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add tram T1"', 'The message.'],
        ]),
        runExpectingFailure('git merge express', [
          ['git merge', 'Brings the changes of another branch into the current one.'],
          ['express', 'Both branches added a line at the same place in lines.txt, so this merge cannot finish on its own.'],
        ]),
      ],
      notice: [
        'Git printed `CONFLICT (content)` and the command ended with exit code 1. The merge is paused, not broken.',
        'The board shows a "merge in progress" banner, and lines.txt is marked as a conflict in the staging area.',
      ],
    },
    {
      id: 'inspect-conflict',
      title: 'Read the conflict',
      body: [
        'Git wrote both versions into the file, separated by markers. Between `<<<<<<< HEAD` and `=======` is your side (the branch you are on). Between `=======` and `>>>>>>> express` is the incoming side.',
        'If you are not ready to deal with it, `git merge --abort` puts everything back the way it was before the merge. Try that first: knowing the way out makes conflicts far less stressful.',
      ],
      actions: [
        gitStatus(),
        catFile('lines.txt'),
        run('git merge --abort', [
          ['git merge', 'The merge command.'],
          ['--abort', 'Cancel the merge in progress and restore the files and staging area to their state before it started.'],
        ]),
      ],
      notice: [
        '`git status` lists lines.txt under "Unmerged paths" as "both modified".',
        'After the abort, the banner disappears and lines.txt is clean again.',
      ],
    },
    {
      id: 'resolve',
      title: 'Resolve the conflict',
      body: [
        'Merge again, and this time finish the job. Resolving means editing the file until it contains what you actually want, with the three marker lines removed. Here both lines should stay.',
        'Then tell git you are done: `git add` marks the file as resolved, and `git commit` completes the merge.',
      ],
      actions: [
        runExpectingFailure('git merge express', [
          ['git merge', 'Brings the changes of another branch into the current one.'],
          ['express', 'The same merge as before. It stops at the same conflict.'],
        ]),
        edit(
          'lines.txt',
          'Keep both the Tram T1 line and the Express line, and delete the three marker lines.',
          RESOLVED_LINES,
        ),
        run('git add lines.txt', [
          ['git add', 'Copies content into the staging area. During a merge this also marks the conflict in that file as resolved.'],
          ['lines.txt', 'The file you just fixed.'],
        ]),
        run('git commit --no-edit', [
          ['git commit', 'With a merge in progress, this concludes it by creating the merge commit.'],
          ['--no-edit', 'Keep the message git prepared ("Merge branch \'express\'") without opening an editor.'],
        ]),
      ],
      notice: [
        'The editor highlights the conflict and offers "keep both", which removes the markers for you.',
        'After the commit, a second merge station joins `express` into `main` on the line map.',
      ],
      term: {
        name: 'Conflict',
        text: 'Two branches changed the same lines differently. Git pauses the merge and you decide the final content.',
      },
    },
    {
      id: 'cleanup',
      title: 'Delete merged branches',
      body: [
        'Once a branch is merged, its name has done its job. Deleting it removes only the label. The commits stay, because `main` reaches them.',
        '`-d` is the careful form: it refuses to delete a branch whose commits are not merged anywhere. `-D` forces it. You will need that in the next chapter.',
      ],
      actions: [
        run('git branch -d night-line green-line express', [
          ['git branch', 'Manages branches.'],
          ['-d', 'Delete, but only if the branch is fully merged.'],
          ['night-line green-line express', 'Several branch names can be given at once.'],
        ]),
        run('git branch', [
          ['git branch', 'Lists local branches.'],
        ]),
      ],
      notice: [
        'Three labels vanish from the line map. Every station is still there.',
      ],
    },
  ],
};
