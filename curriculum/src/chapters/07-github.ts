import { BASE_STARTING_POINT, baseHistory, gitStatus, run, writeLine } from '../builders.ts';
import type { Chapter } from '../types.ts';

export const github: Chapter = {
  id: 'github',
  number: 7,
  title: 'Connect to GitHub',
  tagline: 'Publish the repository, then push, fetch and pull.',
  color: 'purple',
  intro:
    'So far everything lived in one folder. A **remote** is another copy of the repository somewhere else, and GitHub is a place to host one. In this chapter the commands reach your real GitHub account: a real private repository is created there. Each command that changes GitHub asks for your confirmation first.',
  startingPoint: `${BASE_STARTING_POINT} No remote yet.`,
  setup: baseHistory,
  needs: 'github-login',
  requires: { files: ['README.md', 'lines.txt'] },
  steps: [
    {
      id: 'auth',
      title: 'Check your GitHub login',
      body: [
        '`gh` is GitHub\'s official command-line tool. Git itself knows nothing about GitHub features such as repositories-as-a-service, issues or pull requests; `gh` talks to GitHub for those.',
        'First make sure `gh` is logged in. If it is not, run `gh auth login` once in your own terminal (it needs a browser, so it cannot run inside this page).',
      ],
      actions: [
        run('gh auth status', [
          ['gh', 'The GitHub CLI. A separate program from git.'],
          ['auth', 'The group of commands about logging in.'],
          ['status', 'Shows which account is logged in and what the stored token is allowed to do. Read-only.'],
        ]),
      ],
      notice: [
        'The output names your account and lists the token scopes. `repo` is the one needed to create and push to repositories.',
        'The token itself is masked. Mainline blocks `gh auth token`, the command that would print it.',
      ],
    },
    {
      id: 'create-remote',
      title: 'Create a repository on GitHub',
      body: [
        'Create an empty repository on GitHub to push into. This is the same as clicking "New repository" on the website.',
        'It is private, so only you can see it. The name ends in a random suffix so it cannot clash with anything you already have. The last chapter shows how to delete it again.',
      ],
      actions: [
        run('gh repo create {{repoName}} --private --description "Mainline playground"', [
          ['gh repo create', 'Creates a new repository on GitHub under your account.'],
          ['{{repoName}}', 'The name of the new repository.'],
          ['--private', 'Only you (and people you invite) can see it. The alternative is --public.'],
          ['--description "…"', 'A short description shown on the repository page.'],
        ]),
      ],
      notice: [
        'gh prints the address of the new repository. It exists on GitHub now, empty.',
        'Nothing changed locally: the board and line map are the same. Your repository does not know about the new one yet.',
      ],
    },
    {
      id: 'add-remote',
      title: 'Tell git where the remote is',
      body: [
        'A remote is a nickname for a URL, stored in `.git/config`. By convention the main one is called `origin`.',
        'Adding a remote contacts nobody. It only writes the address down.',
      ],
      actions: [
        run('git remote add origin https://github.com/{{ghUser}}/{{repoName}}.git', [
          ['git remote', 'Manages the list of remotes.'],
          ['add', 'Register a new one.'],
          ['origin', 'The nickname. You will type this instead of the URL from now on.'],
          ['https://github.com/…', 'Where the other copy of the repository lives.'],
        ]),
        run('git remote -v', [
          ['git remote', 'Lists remotes.'],
          ['-v', 'Verbose: show the URL used for fetching and for pushing.'],
        ]),
      ],
      notice: [
        'A **remote** strip appears under the board, showing `origin` and its address.',
        'It says nothing has been pushed yet: GitHub still has no commits.',
      ],
      term: {
        name: 'Remote',
        text: 'A named address of another copy of the repository. `origin` is the conventional name for the main one.',
      },
    },
    {
      id: 'first-push',
      title: 'Push your commits',
      body: [
        '`git push` uploads commits the remote does not have and moves the remote\'s branch to match yours.',
        'The `-u` option also records that your local `main` **tracks** `origin/main`. After that, a plain `git push` or `git pull` knows where to go, and `git status` can tell you how far ahead or behind you are.',
      ],
      actions: [
        run('git push -u origin main', [
          ['git push', 'Uploads commits and updates a branch on the remote.'],
          ['-u', 'Short for --set-upstream: remember origin/main as the counterpart of this branch.'],
          ['origin', 'Which remote to push to.'],
          ['main', 'Which branch to push.'],
        ]),
        run('git branch -vv', [
          ['git branch', 'Lists local branches.'],
          ['-vv', 'Very verbose: add each branch\'s newest commit and, in square brackets, the remote branch it tracks.'],
        ]),
      ],
      notice: [
        'A new label, `origin/main`, appears on the line map on the same station as `main`. It is your local record of where the branch is on GitHub.',
        'The remote strip reports "in sync".',
        'The GitHub tab on the right now shows the repository. Open the link to see your files on github.com.',
      ],
      term: {
        name: 'Remote-tracking branch',
        text: '`origin/main` is a local bookmark of where `main` was on the remote the last time you talked to it.',
      },
    },
    {
      id: 'view',
      title: 'Look at it from the command line',
      body: [
        'Everything on the repository page is also available through `gh`.',
      ],
      actions: [
        run('gh repo view', [
          ['gh repo', 'The group of commands about repositories.'],
          ['view', 'Shows the name, description and README of a repository. With no name given, gh uses the one your origin remote points at.'],
        ]),
      ],
      notice: [
        'The README you wrote in the playground is printed back, this time fetched from GitHub.',
      ],
    },
    {
      id: 'ahead',
      title: 'Get ahead, then push',
      body: [
        'Commit something new. The commit exists only on your machine until you push it.',
        'Git tracks the gap for you. "Ahead" counts commits you have that the remote lacks.',
      ],
      actions: [
        writeLine('Maps are updated every spring.', 'README.md', 'append'),
        run('git commit -am "Mention map updates"', [
          ['git commit -a', 'Stage all changed tracked files, then commit.'],
          ['-m "Mention map updates"', 'The message.'],
        ]),
        gitStatus(),
        run('git push', [
          ['git push', 'With no arguments: push the current branch to the remote branch it tracks. This works because of the earlier -u.'],
        ]),
      ],
      notice: [
        'After the commit, `main` is one station past `origin/main`, and the remote strip shows 1 to push.',
        '`git status` says "Your branch is ahead of \'origin/main\' by 1 commit".',
        'After the push, `origin/main` catches up and the strip is back in sync.',
      ],
    },
    {
      id: 'remote-change',
      title: 'Let GitHub get ahead of you',
      body: [
        'Other people push to the remote too. To see what that looks like, add a file directly on GitHub, the way a teammate (or the website\'s edit button) would. This uses the GitHub API to create a commit on the server.',
        'Then ask git for the status. It will claim you are up to date. Git never contacts the remote on its own: `origin/main` is a bookmark from the last time you talked to GitHub, and it is now stale.',
      ],
      actions: [
        run(
          'gh api -X PUT "repos/{owner}/{repo}/contents/CONTRIBUTING.md" -f message="Add a contributing guide" -f content="IyBDb250cmlidXRpbmcKCk9wZW4gYW4gaXNzdWUgZmlyc3QsIHRoZW4gc2VuZCBhIHB1bGwgcmVxdWVzdC4K"',
          [
            ['gh api', 'Sends a raw request to the GitHub API.'],
            ['-X PUT', 'The HTTP method. PUT on this address means "create or update a file".'],
            ['"repos/{owner}/{repo}/contents/CONTRIBUTING.md"', 'The API address. gh fills in {owner} and {repo} from your origin remote.'],
            ['-f message="…"', 'A field of the request: the commit message for the new commit on GitHub.'],
            ['-f content="…"', 'The file content, base64-encoded as the API requires. It decodes to a short contributing guide.'],
          ],
        ),
        gitStatus(),
      ],
      notice: [
        'GitHub answers with a description of the commit it just created on the server.',
        '`git status` still says "up to date with \'origin/main\'". The line map has not changed either. Your repository has not heard the news.',
      ],
    },
    {
      id: 'fetch',
      title: 'Fetch: download without merging',
      body: [
        '`git fetch` contacts the remote, downloads commits you do not have, and moves the `origin/…` bookmarks. It does not touch your branches or your files, so it is always safe.',
        'After a fetch you can inspect what arrived before deciding what to do with it.',
      ],
      actions: [
        run('git fetch', [
          ['git fetch', 'Downloads new commits from the remote and updates the remote-tracking branches. Your own branches stay where they are.'],
        ]),
        gitStatus(),
        run('git log --oneline main..origin/main', [
          ['git log --oneline', 'Compact list of commits.'],
          ['main..origin/main', 'A range: commits reachable from origin/main but not from main. In other words, what the remote has that you do not.'],
        ]),
      ],
      notice: [
        'A new station appears on the line map with `origin/main` on it, one ahead of your `main`.',
        'The remote strip shows 1 to pull, and `git status` says you are "behind by 1 commit".',
        'CONTRIBUTING.md is still missing from the board: fetched commits are in the database, not in your files.',
      ],
      term: {
        name: 'Fetch',
        text: 'Download new commits and update the origin/… bookmarks. Changes nothing you are working on.',
      },
    },
    {
      id: 'pull',
      title: 'Pull: fetch and merge',
      body: [
        '`git pull` is two commands in one: `git fetch`, then merge the tracked remote branch into your current branch.',
        'Here your `main` has no new commits of its own, so the merge is a fast-forward, exactly like in chapter 5.',
      ],
      actions: [
        run('git pull', [
          ['git pull', 'Fetches from the tracked remote, then merges the tracked branch (origin/main) into the current branch.'],
        ]),
      ],
      notice: [
        '`main` slides forward to join `origin/main`, and CONTRIBUTING.md appears in all three columns of the board.',
        'The remote strip is in sync again. The repository stays on GitHub; chapter 8 continues with it.',
      ],
      term: {
        name: 'Pull',
        text: 'Fetch plus merge. The everyday way to bring your branch up to date with the remote.',
      },
    },
  ],
};
