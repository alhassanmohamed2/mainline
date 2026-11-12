import { BASE_STARTING_POINT, baseHistory, catFile, gitLogOneline, gitStatus, run, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

const addLinesTxt = () =>
  run('git add lines.txt', [
    ['git add', 'Copies content from the working directory into the staging area.'],
    ['lines.txt', 'The file to stage.'],
  ]);

export const undo: Chapter = {
  id: 'undo',
  number: 4,
  title: 'Undo almost anything',
  tagline: 'Step back at every stage, and know which steps are final.',
  color: 'green',
  intro:
    'Every area has its own undo. Which command you need depends on how far a change has travelled: still in your files, staged, or committed. One rule holds throughout: what was committed can nearly always be recovered, and what was never committed cannot.',
  startingPoint: BASE_STARTING_POINT,
  setup: baseHistory,
  requires: { files: ['README.md', 'lines.txt'] },
  steps: [
    {
      id: 'discard',
      title: 'Throw away an edit',
      body: [
        'You changed a file and regret it. `git restore` overwrites the working copy with the version from the staging area, which here is the same as the last commit.',
        'This is one of the few commands that destroys work for good. The discarded lines were never stored by git, so there is nothing to recover them from.',
      ],
      actions: [
        writeLine('Blue Line: closed until further notice', 'lines.txt', 'append'),
        gitStatus(),
        run('git restore lines.txt', [
          ['git restore', 'Replaces files in the working directory with a stored version.'],
          ['lines.txt', 'The file to put back. Its unstaged changes are gone after this.'],
        ]),
      ],
      notice: [
        'The red "modified" ticket appears, then the working copy snaps back to the same id as the other two columns.',
        'Notice that `git status` itself suggested this command in its hint.',
      ],
    },
    {
      id: 'unstage',
      title: 'Take something out of the staging area',
      body: [
        'You staged a change too early. `git restore --staged` resets the staged copy to the version in the last commit. Your file on disk is not touched, so the edit is still there, just no longer queued for the next commit.',
      ],
      actions: [
        writeLine('Blue Line: University - Central - Stadium', 'lines.txt', 'append'),
        addLinesTxt(),
        run('git restore --staged lines.txt', [
          ['git restore', 'Replaces a stored version with another one.'],
          ['--staged', 'Operate on the staging area instead of the working directory: copy the file from the last commit into the staging area.'],
          ['lines.txt', 'The file to unstage.'],
        ]),
      ],
      notice: [
        'The green ticket in the staging area appears and then goes back to matching the last commit.',
        'The working directory keeps its red "modified" ticket throughout: your edit survives.',
      ],
    },
    {
      id: 'amend',
      title: 'Fix the last commit',
      body: [
        'Commit the Blue Line, typo and all. Then repair the message with `--amend`.',
        'Amending does not edit the commit. Commits can never be edited, because their id is a checksum of their content. Git builds a **new** commit with the corrected message and moves the branch to it. The old one is left behind.',
      ],
      actions: [
        run('git commit -am "Add teh Blue Line"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add teh Blue Line"', 'The message, with a deliberate typo.'],
        ]),
        run('git commit --amend -m "Add the Blue Line"', [
          ['git commit', 'Creates a commit.'],
          ['--amend', 'Replace the current commit instead of adding one after it. The new commit gets the same parent as the old one.'],
          ['-m "Add the Blue Line"', 'The corrected message. Anything staged at this moment would be included as well.'],
        ]),
      ],
      notice: [
        'The station for the commit gets a different id after amending.',
        'The old commit is still drawn on the line map as a grey, dashed "ghost": no branch leads to it any more, but git has not deleted it.',
      ],
      term: {
        name: 'Rewriting history',
        text: 'Replacing commits with new ones. Safe for commits only you have; a problem for commits other people already pulled.',
      },
    },
    {
      id: 'reset-soft',
      title: 'Undo a commit, keep it staged',
      body: [
        '`git reset` moves the current branch to another commit. Its three modes differ only in what happens to the staging area and your files.',
        '`--soft` moves the branch and nothing else. The changes from the undone commit stay staged, ready to be committed again, perhaps together with something you forgot.',
      ],
      actions: [
        run('git reset --soft HEAD~1', [
          ['git reset', 'Moves the current branch (and HEAD with it) to the given commit.'],
          ['--soft', 'Leave the staging area and the working directory exactly as they are.'],
          ['HEAD~1', 'The destination: the parent of the current commit.'],
        ]),
        gitStatus(),
        run('git commit -m "Add the Blue Line"', [
          ['git commit', 'Saves the staging area as a new commit.'],
          ['-m "Add the Blue Line"', 'The message.'],
        ]),
      ],
      notice: [
        'After the reset, `main` sits one station back and lines.txt is green in the staging area: staged, but not committed.',
        'Committing again creates yet another new commit. The previous attempts stay behind as ghosts.',
      ],
    },
    {
      id: 'reset-mixed',
      title: 'Undo a commit, keep the edits',
      body: [
        'With no option, `git reset` uses `--mixed`: it moves the branch **and** resets the staging area to match. The changes from the undone commit drop back to being plain edits in your working directory.',
        'Use this when you want to re-do the staging, for example to split one commit into two.',
      ],
      actions: [
        run('git reset HEAD~1', [
          ['git reset', 'Moves the current branch to the given commit. Default mode: --mixed.'],
          ['HEAD~1', 'One commit back. The staging area is reset to this commit; files on disk are left alone.'],
        ]),
        gitStatus(),
        run('git commit -am "Add the Blue Line"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add the Blue Line"', 'The message.'],
        ]),
      ],
      notice: [
        'After this reset, lines.txt is red in the working directory and the staging area matches the last commit.',
        'Compare with the previous step, where the same file was green in the staging area.',
      ],
    },
    {
      id: 'reset-hard',
      title: 'Undo a commit and its changes',
      body: [
        '`--hard` moves the branch, resets the staging area, and overwrites your files. All three trees end up identical to the target commit.',
        'It also discards any uncommitted edits you had, without asking. That part is permanent. The commit itself is another matter, as the next step shows.',
      ],
      actions: [
        run('git reset --hard HEAD~1', [
          ['git reset', 'Moves the current branch to the given commit.'],
          ['--hard', 'Also overwrite the staging area and the working directory to match that commit.'],
          ['HEAD~1', 'One commit back.'],
        ]),
        catFile('lines.txt'),
      ],
      notice: [
        'The Blue Line is gone from the file. All three columns on the board show the older id.',
        'The Blue Line commit is now a ghost on the line map.',
      ],
    },
    {
      id: 'reflog',
      title: 'Get a "lost" commit back',
      body: [
        'Git keeps a private diary of every position HEAD has been in: the **reflog**. `HEAD@{1}` means "where HEAD was one move ago".',
        'The commit you just reset away is still in the database, and the reflog knows its id. Point the branch back at it and everything returns.',
      ],
      actions: [
        run('git reflog', [
          ['git reflog', 'Lists every recent position of HEAD, newest first, with the action that moved it.'],
        ]),
        run('git reset --hard HEAD@{1}', [
          ['git reset --hard', 'Move the branch and make the staging area and files match.'],
          ['HEAD@{1}', 'The previous position of HEAD according to the reflog: the Blue Line commit, just before the hard reset.'],
        ]),
        catFile('lines.txt'),
      ],
      notice: [
        'The ghost station becomes a normal station again, with `main` and `HEAD` on it.',
        'The reflog shows every commit, amend and reset you made in this chapter.',
      ],
      term: {
        name: 'Reflog',
        text: 'A local record of where HEAD and branches have pointed. Entries are kept for about 90 days, then unreferenced commits are cleaned up.',
      },
    },
    {
      id: 'revert',
      title: 'Undo without rewriting',
      body: [
        'Amend and reset replace commits. That is fine for work nobody else has seen. Once a commit is shared, replacing it causes trouble for everyone who has it.',
        '`git revert` is the safe alternative: it adds a **new** commit that applies the exact opposite of an earlier one. History only grows, so nobody else\'s copy breaks.',
      ],
      actions: [
        run('git revert HEAD --no-edit', [
          ['git revert', 'Creates a new commit that undoes the changes of the given commit.'],
          ['HEAD', 'The commit to undo: here, the Blue Line commit.'],
          ['--no-edit', 'Accept the generated message ("Revert …") instead of opening an editor.'],
        ]),
        gitLogOneline(),
      ],
      notice: [
        'A new station is added after the Blue Line commit. Nothing was removed.',
        'lines.txt is back to one line, and both the original commit and its reversal remain in the log.',
      ],
    },
  ],
};
