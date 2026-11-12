# Mainline

Learn git and GitHub by running real commands and watching what they do.

Mainline is a small web app that runs on your own computer. Every command in its lessons is executed for real, by the real `git` and `gh` programs, in a sandbox folder on your disk. After each command the page re-reads the repository and redraws it, so you see exactly what changed:

- **Lesson** (left): eight chapters, from `git init` to pull requests. Every command is explained part by part, with station progress, quick copy, and "send to prompt" practice buttons.
- **Workbench** (middle): the three places a file can be (working directory, staging area, last commit), instant file actions (+Stage, -Unstage, Diff), filter search, a plain-language list of what the last command changed, and an interactive terminal with tab autocomplete, history, and scroll indicators.
- **Line map** (right): the commit graph drawn as a transit map, interactive commit details, plus a view of what is inside `.git`, plus what GitHub reports about your repository.
- **Fully resizable layout**: Drag splitters between panels horizontally or vertically to size each pane, with persistent dimensions and double-click to reset.
- **Wayfinding & Tools**: Press `⌘K` or `Ctrl+K` for instant command and curriculum search, or `?` for keyboard shortcuts and transit line legend.

Nothing is simulated. If you open the sandbox folder in your file manager or your own terminal, you will find the same files and the same commits.

---

## 1. What you need

| Tool | Version | Needed for |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22.18 or newer (24 LTS is fine) | running Mainline |
| [git](https://git-scm.com) | 2.28 or newer | everything |
| [GitHub CLI `gh`](https://cli.github.com) | any recent version | chapters 7 and 8 only |
| A GitHub account | free | chapters 7 and 8 only |
| A current browser | Chrome, Edge, Firefox or Safari | viewing the page |

Chapters 1 to 6 work completely offline with just Node.js and git.

Not sure what you already have? After step 3 below, run `npm run doctor`. It checks everything and prints the install command for your system.

## 2. Install the tools

Pick your operating system. Skip anything you already have.

### Windows 10 / 11

Open **PowerShell** and run:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.cli
```

Close PowerShell and open it again so the new programs are found.

No `winget`? Use the installers instead: [Node.js](https://nodejs.org), [Git for Windows](https://git-scm.com/download/win), [GitHub CLI](https://cli.github.com).

### macOS

With [Homebrew](https://brew.sh):

```bash
brew install node git gh
```

Without Homebrew: install Node.js from [nodejs.org](https://nodejs.org), run `xcode-select --install` to get git, and download `gh` from [cli.github.com](https://cli.github.com).

### Linux

**Fedora / RHEL**

```bash
sudo dnf install nodejs git gh
```

**Arch / Manjaro**

```bash
sudo pacman -S nodejs npm git github-cli
```

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt install git gh
```

The Node.js in the Debian and Ubuntu repositories is often too old. Install a current one with [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# open a new terminal, then:
nvm install --lts
```

If `apt` cannot find `gh`, or you want the newest release, follow the [official Linux instructions](https://github.com/cli/cli/blob/trunk/docs/install_linux.md).

### Check the versions

```bash
node --version   # v22.18.0 or higher
git --version    # 2.28 or higher
gh --version     # optional
```

## 3. One-time setup

**Tell git who you are** (skip if you already use git). Your commits are labelled with this name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Log in to GitHub** (only for chapters 7 and 8):

```bash
gh auth login
```

Choose **GitHub.com**, then **HTTPS**, then **Login with a web browser**, and follow the prompts.

**Install Mainline's own dependencies.** In a terminal, go to this folder and run:

```bash
npm install
npm run doctor
```

`doctor` should end with "Everything is in place" (warnings about `gh` are fine if you only want the local chapters).

## 4. Start it

```bash
npm start
```

Then open **http://localhost:4477** in your browser.

To stop Mainline, press `Ctrl + C` in the terminal where it is running.

Start with chapter 1 and press **Run** on each step. When you jump into a later chapter, use **Set up the sandbox for this chapter**: Mainline empties the sandbox and replays real commands to build the state that chapter starts from.

## 5. What is real, and what is protected

Mainline runs programs on your computer, so here is exactly what it will and will not do.

- **Commands run in one folder only.** The sandbox is `.sandbox/playground` inside this project (the path is shown at the top of the page). File helpers such as `echo`, `cat` and `rm` refuse any path outside it.
- **Your git settings are left alone.** Sandbox commands use a separate config file (`.sandbox/gitconfig`) as their "global" config. Your name and email are copied into it once; your real `~/.gitconfig` is never written to.
- **Only `git` and `gh` are started,** directly and without a shell. Pipes, `&&`, variables and other programs are rejected with an explanation.
- **Anything that changes GitHub asks first.** `git push`, `gh repo create`, `gh pr merge` and similar show a confirmation with the exact command. Read-only commands (`gh pr list`, `git fetch`) run straight away.
- **Your credentials stay private.** Commands that print or change your GitHub login (`gh auth token`, `gh auth logout`, …) are blocked.
- **Only this computer can reach it.** The server listens on `127.0.0.1` and refuses requests that do not come from the Mainline page itself.

### What the GitHub chapters create

Chapter 7 creates one **private** repository on your account, named `mainline-playground-` plus four random characters. Chapter 8 adds an issue, a pull request and a release to it.

To remove it afterwards, either delete it from its **Settings** page on github.com, or allow `gh` to delete repositories once and use the last step of chapter 8:

```bash
gh auth refresh -h github.com -s delete_repo
```

Resetting the sandbox never deletes anything on GitHub.

## 6. Settings

Set these environment variables before starting, if you need to:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAINLINE_PORT` | `4477` | Port of the app |
| `MAINLINE_WEB_PORT` | `5177` | Port of the page in development mode |
| `MAINLINE_SANDBOX` | `.sandbox` in this folder | Where the sandbox lives |

```bash
# macOS / Linux
MAINLINE_PORT=4488 npm start
```

```powershell
# Windows PowerShell
$env:MAINLINE_PORT = "4488"; npm start
```

## 7. Troubleshooting

| Problem | What to do |
| --- | --- |
| `npm start` says the Node version is unsupported, or fails on a `.ts` file | Your Node.js is older than 22.18. Update it (section 2). |
| "git is not installed or not on your PATH" in the terminal panel | Install git, then **open a new terminal** and start Mainline again. |
| "Port 4477 is already in use" | Another program uses that port. Start with a different `MAINLINE_PORT` (section 6). |
| The page says the server is not answering | Mainline is not running. Run `npm start` again and reload. |
| Chapter 7 says gh is not logged in | Run `gh auth login` in your own terminal, then reload the page. |
| `git push` is refused or asks for a password | Run `gh auth login` and choose **HTTPS**. Mainline pushes through `gh`'s login. |
| `gh repo delete` is refused | Run `gh auth refresh -h github.com -s delete_repo` once (section 5). |
| A lesson step fails unexpectedly | The sandbox has drifted from what the lesson expects. Use **Rebuild this starting point** at the top of the chapter. |
| You want a completely fresh start | Stop Mainline and delete the `.sandbox` folder. It is recreated on the next start. |

Mainline was developed and tested on Linux. The server uses only cross-platform Node.js APIs and should behave the same on macOS and Windows, but those have not been tested yet. If something misbehaves there, please report what `npm run doctor` prints.

---

## For developers

### Commands

| Command | What it does |
| --- | --- |
| `npm start` | Builds the page and serves everything on one port |
| `npm run dev` | Development mode with hot reload. Open http://localhost:5177 |
| `npm run doctor` | Checks Node.js, git, gh and your GitHub login |
| `npm test` | Unit tests (command parser, safety policy, graph layout, effect descriptions) |
| `npm run typecheck` | Type-checks every package |
| `npm run verify:curriculum` | Runs every local lesson for real in a temporary sandbox and checks each exit code |

### How it is put together

Four small packages in one npm workspace. TypeScript throughout; the server runs it directly with Node's built-in type stripping, so there is no server build step.

```
shared/        Types shared by server and page: the repository snapshot and the API protocol
curriculum/    The lessons as plain data (one file per chapter)
server/        Runs commands and reads the repository
  src/exec/      tokenize → policy → runner: turns a typed line into one safe process
  src/git/       Reads the real state with git plumbing commands (the "snapshot")
  src/sandbox/   The sandbox folder, its environment and path confinement
  src/http/      Tiny router, request guards, static file serving
  src/routes/    One file per API area
web/           The page (React + Vite)
  src/api/       Typed client for the server
  src/state/     Stores: repository, terminal, lesson progress, UI
  src/services/  Actions that span stores (run a command, reset, save a file)
  src/features/  One folder per part of the screen: lesson, board, effects, terminal, map, …
  src/components/, src/lib/, src/styles/   Shared UI pieces, pure helpers, design tokens
scripts/       doctor and verify-curriculum
```

The flow for one command:

1. The page sends the line to `POST /api/run`.
2. `tokenize` splits it into words the way a shell would, without being a shell.
3. `policy` decides: run it, ask for confirmation first, or reject it with a reason.
4. `runner` starts `git` or `gh` in the sandbox and streams the output back line by line.
5. `snapshot` re-reads the repository (HEAD, refs, commits, the three file trees, remotes, stash).
6. The page compares the snapshot with the previous one. That comparison produces the "what changed" list and drives every drawing on screen.

### Adding a lesson

Add a file in `curriculum/src/chapters/`, export a `Chapter`, and list it in `curriculum/src/index.ts`. A chapter's `setup` is the list of commands that recreate its starting state. Run `npm run verify:curriculum` to prove that every command in it really ends the way the lesson says.
