import { gitLogOneline, run, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

export const collaborate: Chapter = {
  id: 'collaborate',
  number: 8,
  title: 'Issues and pull requests',
  tagline: 'The GitHub workflow: issue, branch, pull request, merge, release.',
  color: 'pink',
  intro:
    'Teams rarely push straight to `main`. Work is described in an issue, done on a branch, proposed as a pull request, reviewed, and merged on GitHub. You will go through that whole loop with real issues and pull requests in your playground repository.',
  startingPoint:
    'The playground as chapter 7 left it: connected to your private GitHub repository through the remote `origin`.',
  setup: null,
  needs: 'github-remote',
  steps: [
    {
      id: 'issue',
      title: 'Open an issue',
      body: [
        'An issue is a numbered note on GitHub: a bug, a task, an idea. It gives the work a place for discussion and a number to refer to.',
      ],
      actions: [
        run(
          'gh issue create --title "Add the Blue Line" --body "The Blue Line (University - Central - Stadium) is missing from lines.txt."',
          [
            ['gh issue create', 'Opens a new issue in the repository behind origin.'],
            ['--title "…"', 'The headline of the issue.'],
            ['--body "…"', 'The description. Giving both title and body avoids the interactive prompts.'],
          ],
        ),
        run('gh issue list', [
          ['gh issue', 'The group of commands about issues.'],
          ['list', 'Shows open issues.'],
        ]),
      ],
      notice: [
        'gh prints the address of the new issue. In a fresh repository it is number 1.',
        'The issue appears in the GitHub tab on the right.',
      ],
    },
    {
      id: 'feature-branch',
      title: 'Do the work on a branch',
      body: [
        'Start a branch for the change and commit there. This part is plain git and entirely local.',
      ],
      actions: [
        run('git switch -c blue-line', [
          ['git switch -c', 'Create a branch and switch to it.'],
          ['blue-line', 'A name that says what the branch is for.'],
        ]),
        writeLine('Blue Line: University - Central - Stadium', 'lines.txt', 'append'),
        run('git commit -am "Add the Blue Line"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Add the Blue Line"', 'The message.'],
        ]),
      ],
      notice: [
        '`blue-line` is one station ahead of `main` and `origin/main`.',
      ],
    },
    {
      id: 'push-branch',
      title: 'Push the branch',
      body: [
        'GitHub can only show a branch it has. Push it, and set the upstream so later pushes need no arguments.',
      ],
      actions: [
        run('git push -u origin blue-line', [
          ['git push', 'Uploads commits and updates a branch on the remote.'],
          ['-u', 'Remember origin/blue-line as the counterpart of this branch.'],
          ['origin blue-line', 'The remote, and the branch to push. It is created on GitHub because it does not exist there yet.'],
        ]),
      ],
      notice: [
        'A new `origin/blue-line` label appears on the line map next to `blue-line`.',
      ],
    },
    {
      id: 'pull-request',
      title: 'Open a pull request',
      body: [
        'A pull request says: "please merge this branch into that one". It shows the commits and the diff, and gives reviewers a place to comment and approve.',
        'The phrase `Closes #1` in the description is understood by GitHub: when this pull request is merged, issue 1 is closed automatically. If your issue has a different number, type the command yourself with that number.',
      ],
      actions: [
        run('gh pr create --title "Add the Blue Line" --body "Closes #1"', [
          ['gh pr create', 'Opens a pull request from the current branch into the repository\'s default branch.'],
          ['--title "…"', 'The headline of the pull request.'],
          ['--body "Closes #1"', 'The description. "Closes #1" links the pull request to issue 1.'],
        ]),
        run('gh pr view', [
          ['gh pr', 'The group of commands about pull requests.'],
          ['view', 'Shows the pull request that belongs to the current branch.'],
        ]),
        run('gh pr diff', [
          ['gh pr diff', 'Shows the changes the pull request proposes, as GitHub sees them.'],
        ]),
      ],
      notice: [
        'The pull request appears in the GitHub tab, showing `blue-line` going into `main`.',
        'Nothing is merged yet. `main` has not moved, locally or on GitHub.',
      ],
      term: {
        name: 'Pull request',
        text: 'A proposal to merge one branch into another, with a diff, discussion and review attached.',
      },
    },
    {
      id: 'merge-pr',
      title: 'Merge it on GitHub',
      body: [
        'Normally a teammate reviews first. Here you merge your own pull request.',
        'GitHub offers three ways to merge. `--merge` creates a merge commit. `--rebase` replays the commits onto main. `--squash` combines all commits of the branch into a single new commit on main, which keeps main tidy when a branch has many small commits.',
        'With `--delete-branch`, gh also removes the branch on GitHub and locally, switches you back to `main` and pulls the result.',
      ],
      actions: [
        run('gh pr merge --squash --delete-branch', [
          ['gh pr merge', 'Merges the pull request of the current branch on GitHub.'],
          ['--squash', 'Combine the branch\'s commits into one commit on the base branch.'],
          ['--delete-branch', 'Afterwards delete the branch on GitHub and on this machine, and switch to the default branch.'],
        ]),
        gitLogOneline(),
      ],
      notice: [
        'You are back on `main`, which now has a new commit created by GitHub. Its message ends with the pull request number.',
        'Your original commit on `blue-line` is a ghost: squashing made a new commit instead of reusing it.',
        'In the GitHub tab the pull request is marked merged.',
      ],
    },
    {
      id: 'after-merge',
      title: 'Check the results',
      body: [
        'Merging the pull request closed the issue, because of the `Closes #1` line.',
      ],
      actions: [
        run('gh issue list --state closed', [
          ['gh issue list', 'Lists issues.'],
          ['--state closed', 'Show closed issues instead of open ones.'],
        ]),
        run('gh pr list --state merged', [
          ['gh pr list', 'Lists pull requests.'],
          ['--state merged', 'Show merged pull requests.'],
        ]),
      ],
      notice: [
        'The issue is listed as closed and the pull request as merged.',
      ],
    },
    {
      id: 'release',
      title: 'Publish a release',
      body: [
        'Tags are not pushed by `git push` unless you name them. Push the tag, then turn it into a GitHub release: a page with notes and downloadable source archives, attached to that tag.',
      ],
      actions: [
        run('git tag -a v1.1 -m "Blue Line edition"', [
          ['git tag -a', 'Create an annotated tag on the current commit.'],
          ['v1.1', 'The tag name.'],
          ['-m "Blue Line edition"', 'The tag message.'],
        ]),
        run('git push origin v1.1', [
          ['git push', 'Uploads to a remote.'],
          ['origin', 'The remote.'],
          ['v1.1', 'The tag to upload. Tags must be pushed explicitly.'],
        ]),
        run('gh release create v1.1 --title "Blue Line edition" --notes "Adds the Blue Line."', [
          ['gh release create', 'Publishes a release on GitHub.'],
          ['v1.1', 'The existing tag the release is attached to.'],
          ['--title "…" --notes "…"', 'The name and the release notes.'],
        ]),
        run('gh release list', [
          ['gh release list', 'Lists the releases of the repository.'],
        ]),
      ],
      notice: [
        'The `v1.1` label is on the line map, and the release is listed as "Latest".',
      ],
    },
    {
      id: 'teardown',
      title: 'Clean up',
      body: [
        'The playground repository is still on your GitHub account. Delete it when you are finished.',
        'Deleting needs a permission that gh does not ask for by default. If the command is refused, run `gh auth refresh -h github.com -s delete_repo` in your own terminal and try again, or delete the repository from its Settings page on github.com.',
        'Finally, remove the remote so the playground forgets about it.',
      ],
      actions: [
        run('gh repo delete {{ghUser}}/{{repoName}} --yes', [
          ['gh repo delete', 'Permanently deletes a repository from GitHub.'],
          ['{{ghUser}}/{{repoName}}', 'The repository, written as owner/name. Naming it in full avoids deleting the wrong one.'],
          ['--yes', 'Skip gh\'s own confirmation prompt, which cannot be answered here. Mainline asks you instead.'],
        ]),
        run('git remote remove origin', [
          ['git remote', 'Manages remotes.'],
          ['remove', 'Forget a remote and its origin/… bookmarks.'],
          ['origin', 'The remote to forget. Your local commits are not affected.'],
        ]),
      ],
      notice: [
        'The remote strip and the `origin/…` labels disappear. Your local history is complete and untouched.',
      ],
    },
  ],
};
