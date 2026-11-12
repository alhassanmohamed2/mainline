import { catFile, gitStatus, run, runExpectingFailure } from '../builders.ts';
import type { Chapter } from '../types.ts';

export const create: Chapter = {
  id: 'create',
  number: 1,
  title: 'Create a repository',
  tagline: 'Turn an ordinary folder into one git watches.',
  color: 'red',
  intro:
    'Git is a program that records snapshots of a folder. Before it can record anything, the folder has to become a repository. You will do that here and look at what git actually creates on disk.',
  startingPoint: 'An empty folder. Git knows nothing about it yet.',
  setup: [],
  requires: { repo: 'absent' },
  steps: [
    {
      id: 'before-git',
      title: 'Ask git about a plain folder',
      body: [
        'The playground is a real, empty folder on your computer. Its path is shown at the top of the page, and you can open it in your file manager at any time.',
        'Ask git what it knows about this folder. It will refuse, and the refusal is useful: git only works inside a repository, and this is not one yet.',
      ],
      actions: [
        runExpectingFailure('git status', [
          ['git', 'The program. Everything after it tells git what to do.'],
          ['status', 'Asks "what is the state of this repository?". Here there is no repository, so git stops with an error.'],
        ]),
      ],
      notice: [
        'The terminal shows `fatal: not a git repository`. The red exit code means the command failed.',
        'The board says there is no repository, and the line map is empty.',
      ],
    },
    {
      id: 'init',
      title: 'Create the repository',
      body: [
        '`git init` creates a hidden folder called `.git` inside the current folder. That hidden folder **is** the repository: every commit, branch and setting lives in it. Your own files stay where they are, outside it.',
        'Nothing is uploaded anywhere. A repository is entirely local until you connect it to a server yourself, which happens in chapter 7.',
      ],
      actions: [
        run('git init', [
          ['git', 'The program.'],
          ['init', 'Short for "initialise". Creates the .git folder with an empty object database and a HEAD that names the first branch.'],
        ]),
      ],
      notice: [
        'The board now has its three columns: working directory, staging area and last commit. All empty.',
        'The header of the line map shows `main` with no commits yet. Git calls this an unborn branch: the name exists, but there is nothing for it to point at.',
      ],
      term: {
        name: 'Repository',
        text: 'The .git folder: a database of snapshots plus the names (branches, tags) that point into it.',
      },
    },
    {
      id: 'inside-dot-git',
      title: 'Look inside .git',
      body: [
        'There is no magic in `.git`. It is a handful of files and folders, and you can read them.',
        '`objects/` will hold your content and commits. `refs/` will hold branches and tags. `HEAD` is a one-line text file that says which branch you are on.',
      ],
      actions: [
        run('ls -a', [
          ['ls', 'Lists the files in the playground folder. A Mainline file helper.'],
          ['-a', 'Includes names that start with a dot, which are normally hidden. Without it you would not see .git.'],
        ]),
        run('ls .git', [
          ['ls', 'Lists files.'],
          ['.git', 'The folder to list: the repository itself.'],
        ]),
        catFile('.git/HEAD'),
      ],
      notice: [
        '`.git/HEAD` contains `ref: refs/heads/main`. That single line is how git knows your current branch.',
        'Open the **Under the hood** tab on the right: it shows the same HEAD file and will keep showing it as it changes.',
      ],
      term: {
        name: 'HEAD',
        text: 'A pointer to where you are right now. Usually it names a branch; the branch in turn points at a commit.',
      },
    },
    {
      id: 'identity',
      title: 'Check who you are',
      body: [
        'Every commit records an author name and email. Git reads them from its configuration, which is layered: system-wide, then per user (`--global`), then per repository (`--local`). The most specific layer wins.',
        'On your own machine you set this once with `git config --global user.name "Your Name"` and the same for `user.email`. Mainline already copied your identity into a config file that belongs only to this sandbox, so your real `~/.gitconfig` is never modified by anything you do here.',
      ],
      actions: [
        run('git config user.name', [
          ['git config', 'Reads or writes git settings.'],
          ['user.name', 'The setting to read. Settings are named section.key. With no value after it, git prints the current value.'],
        ]),
        run('git config user.email', [
          ['git config', 'Reads or writes git settings.'],
          ['user.email', 'The email stamped on your commits. GitHub uses it to link commits to your account.'],
        ]),
        run('git config --list --show-origin', [
          ['git config', 'Reads or writes git settings.'],
          ['--list', 'Prints every setting that applies in this folder, from all layers.'],
          ['--show-origin', 'Adds the file each setting comes from, so you can see which layer supplied it.'],
        ]),
      ],
      notice: [
        'The last command lists two files: the sandbox config (your name, email and default branch) and `.git/config` (settings of this one repository).',
      ],
    },
    {
      id: 'empty-status',
      title: 'Ask again',
      body: [
        'Run the command that failed at the start. This time git has a repository to describe.',
        'Get used to running `git status` constantly. It is free, it changes nothing, and it always tells you what git thinks is going on.',
      ],
      actions: [gitStatus()],
      notice: [
        'Git answers `On branch main`, `No commits yet` and `nothing to commit`.',
        'The exit code is 0, shown in green: the command succeeded.',
      ],
    },
  ],
};
