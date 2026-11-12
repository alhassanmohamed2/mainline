import type { Impact } from '@mainline/shared';
import type { Token } from './tokenize.ts';

/**
 * Decides what a command line is allowed to do. The rule is simple: one
 * program per line, and that program is `git`, `gh`, or one of a few file
 * helpers implemented by Mainline itself.
 */

export const BUILTINS = ['echo', 'cat', 'ls', 'touch', 'rm', 'mkdir', 'mv', 'pwd', 'help'] as const;
export type BuiltinName = (typeof BUILTINS)[number];

export interface Redirect {
  mode: 'write' | 'append';
  target: string;
}

export interface Confirmation {
  title: string;
  details: string[];
  danger: boolean;
}

export type Plan =
  | { kind: 'spawn'; program: 'git' | 'gh'; args: string[]; impact: Impact; confirmation: Confirmation | null }
  | { kind: 'builtin'; name: BuiltinName; args: string[]; redirect: Redirect | null }
  | { kind: 'reject'; reason: string; hint?: string };

const reject = (reason: string, hint?: string): Plan => ({ kind: 'reject', reason, hint });

const FRIENDLY_REJECTIONS: Record<string, [reason: string, hint: string]> = {
  cd: ['`cd` is not needed here.', 'Every command already runs inside the playground folder.'],
  clear: ['Use the clear button above the terminal.', ''],
  vim: ['Editors that take over the terminal cannot run here.', 'Click a file on the board to open it in the editor.'],
  vi: ['Editors that take over the terminal cannot run here.', 'Click a file on the board to open it in the editor.'],
  nano: ['Editors that take over the terminal cannot run here.', 'Click a file on the board to open it in the editor.'],
  code: ['Editors cannot be launched from here.', 'Click a file on the board to open it in the editor.'],
  sudo: ['Mainline never runs anything with elevated rights.', ''],
};

export function plan(tokens: Token[]): Plan {
  if (tokens.length === 0) return reject('Type a command first.');

  const words: string[] = [];
  let redirect: Redirect | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    if (token.type === 'word') {
      words.push(token.value);
      continue;
    }
    if (token.value === '>' || token.value === '>>') {
      const target = tokens[i + 1];
      if (!target || target.type !== 'word') return reject('The redirect is missing a file name.');
      if (redirect || i + 2 !== tokens.length) {
        return reject('Only one redirect at the end of the line is supported.', 'For example: echo "hello" > notes.txt');
      }
      redirect = { mode: token.value === '>' ? 'write' : 'append', target: target.value };
      i += 1;
      continue;
    }
    if (token.value === '&&' || token.value === ';' || token.value === '||') {
      return reject('One command per line, please.', 'Run the commands one after the other.');
    }
    return reject(
      'Pipes and other shell operators are not supported.',
      'Mainline starts git and gh directly, without a shell in between.',
    );
  }

  const [program, ...args] = words;
  if (!program) return reject('Type a command first.');

  if (redirect && program !== 'echo') {
    return reject('Only `echo` can write into a file with > or >>.', 'For example: echo "hello" > notes.txt');
  }

  if (program === 'git') return planGit(args);
  if (program === 'gh') return planGh(args);
  if ((BUILTINS as readonly string[]).includes(program)) {
    return { kind: 'builtin', name: program as BuiltinName, args, redirect };
  }

  const friendly = FRIENDLY_REJECTIONS[program];
  if (friendly) return reject(friendly[0], friendly[1] || undefined);
  return reject(
    `"${program}" cannot be run here.`,
    'Mainline runs git and gh, plus a few file helpers: echo, cat, ls, touch, rm, mkdir, mv, pwd.',
  );
}

/* ---------------------------------- git ---------------------------------- */

/** Global options that are followed by a separate value. */
const GIT_OPTIONS_WITH_VALUE = new Set(['-c', '--namespace', '--config-env', '--super-prefix']);

/** Global options that point git at a different folder: not inside the sandbox. */
const GIT_REDIRECTING_OPTIONS = ['-C', '--git-dir', '--work-tree', '--exec-path'];

const GIT_UNSUPPORTED: Record<string, string> = {
  gui: 'It opens a desktop window.',
  gitk: 'It opens a desktop window.',
  citool: 'It opens a desktop window.',
  difftool: 'It launches an external program.',
  mergetool: 'It launches an external program.',
  instaweb: 'It starts a long-running web server.',
  daemon: 'It starts a long-running server.',
  'send-email': 'It sends email.',
  credential: 'It deals with stored passwords.',
  'credential-store': 'It deals with stored passwords.',
  'credential-cache': 'It deals with stored passwords.',
};

const GIT_NETWORK_READ = new Set(['fetch', 'pull', 'clone', 'ls-remote']);

function gitSubcommand(args: string[]): { name: string | null; blocked?: string } {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (!arg.startsWith('-')) return { name: arg };
    const optionName = arg.split('=')[0]!;
    if (GIT_REDIRECTING_OPTIONS.includes(optionName)) return { name: null, blocked: optionName };
    if (GIT_OPTIONS_WITH_VALUE.has(arg)) i += 1;
  }
  return { name: null };
}

function planGit(args: string[]): Plan {
  const { name, blocked } = gitSubcommand(args);
  if (blocked) {
    return reject(
      `The ${blocked} option points git at another folder.`,
      'Commands here always work on the playground repository.',
    );
  }
  if (name && GIT_UNSUPPORTED[name]) {
    return reject(`\`git ${name}\` cannot run inside Mainline.`, GIT_UNSUPPORTED[name]);
  }

  if (name === 'push') {
    const force = args.some((arg) => arg === '-f' || arg === '--force' || arg.startsWith('--force-') || arg.startsWith('+'));
    const deletes = args.some((arg) => arg === '--delete' || arg === '-d' || arg === '--mirror' || arg === '--prune');
    const details = ['Uploads commits from the playground to its remote repository.'];
    if (force) details.push('Force-pushing can overwrite commits that exist on the remote.');
    if (deletes) details.push('This push removes branches or tags on the remote.');
    return {
      kind: 'spawn',
      program: 'git',
      args,
      impact: 'remote-write',
      confirmation: { title: 'Push to the remote for real?', details, danger: force || deletes },
    };
  }

  const impact: Impact = name && GIT_NETWORK_READ.has(name) ? 'network-read' : 'local';
  return { kind: 'spawn', program: 'git', args, impact, confirmation: null };
}

/* ---------------------------------- gh ----------------------------------- */

/** Matched against "<group> <verb>"; a trailing * covers the whole group. */
const GH_UNSUPPORTED: [pattern: string, reason: string][] = [
  ['auth login', 'It is interactive. Run it once in your own terminal.'],
  ['auth logout', 'Mainline never changes your GitHub login.'],
  ['auth refresh', 'It is interactive. Run it once in your own terminal.'],
  ['auth switch', 'Mainline never changes your GitHub login.'],
  ['auth setup-git', 'Mainline never changes your git credential setup.'],
  ['auth token', 'It would print your access token onto this page.'],
  ['extension *', 'Extensions run arbitrary programs.'],
  ['alias *', 'Aliases can run arbitrary programs.'],
  ['config set', 'Mainline never changes your gh configuration.'],
  ['config clear-cache', 'Mainline never changes your gh configuration.'],
  ['codespace *', 'Codespaces need an interactive terminal.'],
  ['ssh-key *', 'Mainline never touches your account keys.'],
  ['gpg-key *', 'Mainline never touches your account keys.'],
  ['secret *', 'Mainline never touches repository secrets.'],
  ['copilot *', 'It is interactive.'],
];

const GH_READ_ONLY = [
  'auth status',
  'status',
  'browse',
  'version',
  'help *',
  'search *',
  'repo view',
  'repo list',
  'repo clone',
  'repo set-default',
  'pr list',
  'pr view',
  'pr diff',
  'pr status',
  'pr checks',
  'pr checkout',
  'issue list',
  'issue view',
  'issue status',
  'release list',
  'release view',
  'release download',
  'run list',
  'run view',
  'workflow list',
  'workflow view',
  'label list',
  'gist list',
  'gist view',
  'org list',
  'project list',
  'project view',
  'ruleset list',
  'ruleset view',
  'cache list',
  'config get',
  'config list',
];

const GH_WRITE_SUMMARIES: Record<string, string> = {
  'repo create': 'Creates a real repository on your GitHub account.',
  'repo delete': 'Permanently deletes a repository from GitHub. This cannot be undone.',
  'repo edit': 'Changes the settings of a repository on GitHub.',
  'repo rename': 'Renames a repository on GitHub.',
  'repo archive': 'Archives a repository on GitHub.',
  'repo fork': 'Creates a fork on your GitHub account.',
  'repo sync': 'Updates a branch on GitHub.',
  'pr create': 'Opens a real pull request on GitHub.',
  'pr merge': 'Merges the pull request on GitHub.',
  'pr close': 'Closes the pull request on GitHub.',
  'pr comment': 'Posts a comment on GitHub under your name.',
  'pr review': 'Submits a review on GitHub under your name.',
  'issue create': 'Opens a real issue on GitHub.',
  'issue close': 'Closes the issue on GitHub.',
  'issue comment': 'Posts a comment on GitHub under your name.',
  'issue delete': 'Permanently deletes the issue from GitHub.',
  'release create': 'Publishes a release on GitHub.',
  'release delete': 'Deletes a release from GitHub.',
  'gist create': 'Creates a gist on your GitHub account.',
  api: 'Sends a request that changes data through the GitHub API.',
};

const GH_DANGEROUS = new Set(['repo delete', 'issue delete', 'release delete', 'repo archive', 'repo rename']);

function matches(pattern: string, group: string, verb: string): boolean {
  const [patternGroup, patternVerb] = pattern.split(' ');
  if (patternGroup !== group) return false;
  return patternVerb === undefined || patternVerb === '*' || patternVerb === verb;
}

/** `gh api` defaults to GET, and silently becomes POST once fields are passed. */
function ghApiWrites(args: string[]): boolean {
  let method: string | null = null;
  let hasFields = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === '-X' || arg === '--method') method = (args[i + 1] ?? '').toUpperCase();
    else if (arg.startsWith('--method=')) method = arg.slice('--method='.length).toUpperCase();
    else if (/^-X.+/.test(arg)) method = arg.slice(2).toUpperCase();
    else if (['-f', '-F', '--field', '--raw-field', '--input'].includes(arg) || /^--(field|raw-field|input)=/.test(arg)) {
      hasFields = true;
    }
  }
  return method ? method !== 'GET' : hasFields;
}

function planGh(args: string[]): Plan {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  const group = positional[0] ?? '';
  const verb = positional[1] ?? '';
  const spawnPlan = (impact: Impact, confirmation: Confirmation | null): Plan => ({
    kind: 'spawn',
    program: 'gh',
    args,
    impact,
    confirmation,
  });

  // `gh`, `gh --version`, `gh --help`, `gh pr --help`…
  if (!group || args.includes('--help') || args.includes('-h')) return spawnPlan('local', null);

  for (const [pattern, reason] of GH_UNSUPPORTED) {
    if (matches(pattern, group, verb)) return reject(`\`gh ${pattern.replace(' *', '')}\` cannot run inside Mainline.`, reason);
  }

  if (group === 'api') {
    if (!ghApiWrites(args)) return spawnPlan('network-read', null);
  } else if (GH_READ_ONLY.some((pattern) => matches(pattern, group, verb))) {
    return spawnPlan('network-read', null);
  }

  const key = group === 'api' ? 'api' : `${group} ${verb}`.trim();
  const details = [GH_WRITE_SUMMARIES[key] ?? 'Changes something on GitHub using your logged-in account.'];
  if (key === 'repo create') {
    if (args.includes('--public')) details.push('It will be PUBLIC: anyone on the internet can see it.');
    else if (args.includes('--private')) details.push('It will be private: only you can see it.');
    if (args.includes('--push')) details.push('Your local commits are uploaded to it straight away.');
  }
  return spawnPlan('remote-write', {
    title: GH_DANGEROUS.has(key) ? 'This is destructive. Run it for real?' : 'Run this on GitHub for real?',
    details,
    danger: GH_DANGEROUS.has(key),
  });
}
