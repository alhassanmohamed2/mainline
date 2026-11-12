/**
 * Checks that this computer has what Mainline needs, and says how to get
 * whatever is missing on this operating system.
 *
 *   npm run doctor
 */
import { spawnSync } from 'node:child_process';

type Level = 'ok' | 'warn' | 'fail';

interface Finding {
  level: Level;
  name: string;
  detail: string;
  fix?: string[];
}

const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

const INSTALL: Record<'git' | 'gh' | 'node', Record<typeof platform, string[]>> = {
  node: {
    windows: ['winget install OpenJS.NodeJS.LTS', 'or download the LTS installer from https://nodejs.org'],
    macos: ['brew install node', 'or download the LTS installer from https://nodejs.org'],
    linux: ['Use nvm (https://github.com/nvm-sh/nvm):  nvm install --lts', 'or your package manager, if it ships Node 22.18 or newer'],
  },
  git: {
    windows: ['winget install Git.Git', 'or download from https://git-scm.com/download/win'],
    macos: ['brew install git', 'or run: xcode-select --install'],
    linux: ['Debian/Ubuntu:  sudo apt install git', 'Fedora:         sudo dnf install git', 'Arch:           sudo pacman -S git'],
  },
  gh: {
    windows: ['winget install GitHub.cli'],
    macos: ['brew install gh'],
    linux: [
      'Fedora:         sudo dnf install gh',
      'Arch:           sudo pacman -S github-cli',
      'Debian/Ubuntu:  see https://github.com/cli/cli/blob/trunk/docs/install_linux.md',
    ],
  },
};

function run(program: string, args: string[]): { ok: boolean; output: string } {
  const result = spawnSync(program, args, { encoding: 'utf8', timeout: 15_000, windowsHide: true });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() };
}

function atLeast(version: string, minimum: [number, number]): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > minimum[0] || (major === minimum[0] && minor >= minimum[1]);
}

const findings: Finding[] = [];

/* Node */
const nodeVersion = process.versions.node;
findings.push(
  atLeast(nodeVersion, [22, 18])
    ? { level: 'ok', name: 'Node.js', detail: `v${nodeVersion}` }
    : { level: 'fail', name: 'Node.js', detail: `v${nodeVersion} is too old. Mainline needs 22.18 or newer.`, fix: INSTALL.node[platform] },
);

/* git */
const git = run('git', ['--version']);
if (!git.ok) {
  findings.push({ level: 'fail', name: 'git', detail: 'not found on your PATH', fix: INSTALL.git[platform] });
} else {
  const version = /(\d+\.\d+(\.\d+)?)/.exec(git.output)?.[1] ?? '0.0';
  findings.push(
    atLeast(version, [2, 28])
      ? { level: 'ok', name: 'git', detail: version }
      : { level: 'warn', name: 'git', detail: `${version} works for most lessons, but 2.28 or newer is recommended (git switch, git restore, init.defaultBranch).`, fix: INSTALL.git[platform] },
  );

  const name = run('git', ['config', '--global', '--get', 'user.name']);
  const email = run('git', ['config', '--global', '--get', 'user.email']);
  findings.push(
    name.ok && email.ok
      ? { level: 'ok', name: 'git identity', detail: 'user.name and user.email are set' }
      : {
          level: 'warn',
          name: 'git identity',
          detail: 'user.name or user.email is not set. Sandbox commits will be signed "Mainline Learner".',
          fix: ['git config --global user.name "Your Name"', 'git config --global user.email "you@example.com"'],
        },
  );
}

/* gh */
const gh = run('gh', ['--version']);
if (!gh.ok) {
  findings.push({
    level: 'warn',
    name: 'GitHub CLI (gh)',
    detail: 'not found. Chapters 1 to 6 work without it; chapters 7 and 8 need it.',
    fix: INSTALL.gh[platform],
  });
} else {
  findings.push({ level: 'ok', name: 'GitHub CLI (gh)', detail: /gh version (\S+)/.exec(gh.output)?.[1] ?? 'installed' });
  const auth = run('gh', ['auth', 'status', '--hostname', 'github.com']);
  findings.push(
    auth.ok
      ? { level: 'ok', name: 'GitHub login', detail: 'gh is logged in to github.com' }
      : {
          level: 'warn',
          name: 'GitHub login',
          detail: 'gh is not logged in. Needed for chapters 7 and 8.',
          fix: ['gh auth login', '(choose GitHub.com, HTTPS, and "Login with a web browser")'],
        },
  );
}

/* Report */
const MARK: Record<Level, string> = { ok: ' ok ', warn: 'warn', fail: 'FAIL' };
console.log(`\nMainline doctor (${platform})\n`);
for (const finding of findings) {
  console.log(`  [${MARK[finding.level]}] ${finding.name}: ${finding.detail}`);
  for (const line of finding.fix ?? []) console.log(`           ${line}`);
}

const failed = findings.some((finding) => finding.level === 'fail');
const warned = findings.some((finding) => finding.level === 'warn');
console.log(
  failed
    ? '\nFix the FAIL items above, then run "npm run doctor" again.\n'
    : warned
      ? '\nMainline will run. The warnings above limit some chapters.\nStart it with: npm start\n'
      : '\nEverything is in place. Start it with: npm start\n',
);
process.exit(failed ? 1 : 0);
