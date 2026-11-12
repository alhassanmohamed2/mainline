import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { capture } from '../exec/capture.ts';

/**
 * The sandbox is a real folder on disk:
 *
 *   .sandbox/
 *     gitconfig     the sandbox's own "global" git config (your ~/.gitconfig is never touched)
 *     meta.json     bookkeeping
 *     playground/   the project folder every command runs in
 */
export const paths = {
  root: config.sandboxRoot,
  repoDir: path.join(config.sandboxRoot, 'playground'),
  gitconfig: path.join(config.sandboxRoot, 'gitconfig'),
  meta: path.join(config.sandboxRoot, 'meta.json'),
} as const;

export interface SandboxMeta {
  id: string;
  repoName: string;
  createdAt: string;
}

export class SandboxPathError extends Error {}

let meta: SandboxMeta | null = null;

function newMeta(): SandboxMeta {
  const id = randomBytes(2).toString('hex');
  return { id, repoName: `mainline-playground-${id}`, createdAt: new Date().toISOString() };
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/** The learner's real git identity, so sandbox commits carry their own name. */
async function readRealIdentity(): Promise<{ name: string; email: string }> {
  const read = async (key: string) => {
    const result = await capture('git', ['config', '--global', '--get', key], {
      cwd: config.projectRoot,
      env: process.env,
      timeoutMs: 5_000,
    });
    return result.code === 0 ? result.stdout.trim() : '';
  };
  const [name, email] = await Promise.all([read('user.name'), read('user.email')]);
  return { name: name || 'Mainline Learner', email: email || 'learner@mainline.invalid' };
}

async function writeGitconfig(): Promise<void> {
  const { name, email } = await readRealIdentity();
  const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const lines = [
    '# Mainline sandbox configuration.',
    '# Commands run by Mainline use this file as their "global" git config,',
    '# so nothing you do in the sandbox can change your real ~/.gitconfig.',
    '[user]',
    `\tname = ${quote(name)}`,
    `\temail = ${quote(email)}`,
    '[init]',
    '\tdefaultBranch = main',
    '[color]',
    '\tui = always',
    '[credential "https://github.com"]',
    '\thelper =',
    '\thelper = !gh auth git-credential',
    '',
  ];
  await fs.writeFile(paths.gitconfig, lines.join('\n'), 'utf8');
}

export async function ensureWorkspace(): Promise<SandboxMeta> {
  await fs.mkdir(paths.repoDir, { recursive: true });
  if (!(await exists(paths.gitconfig))) await writeGitconfig();
  if (!meta) {
    try {
      meta = JSON.parse(await fs.readFile(paths.meta, 'utf8')) as SandboxMeta;
    } catch {
      meta = newMeta();
      await fs.writeFile(paths.meta, JSON.stringify(meta, null, 2), 'utf8');
    }
  }
  return meta;
}

/** Deletes the playground folder and starts again with an empty one. */
export async function resetWorkspace(): Promise<SandboxMeta> {
  // Belt and braces: only ever delete the folder this module created.
  if (path.basename(paths.repoDir) !== 'playground' || path.dirname(paths.repoDir) !== paths.root) {
    throw new Error('Refusing to reset: unexpected sandbox layout.');
  }
  await fs.rm(paths.repoDir, { recursive: true, force: true, maxRetries: 3 });
  await fs.mkdir(paths.repoDir, { recursive: true });
  await writeGitconfig();
  meta = newMeta();
  await fs.writeFile(paths.meta, JSON.stringify(meta, null, 2), 'utf8');
  return meta;
}

const INHERITED_GIT_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_NAMESPACE'];

/**
 * Environment for everything that runs in the sandbox.
 * - "user": commands the learner runs; colours on, nothing may wait for a keyboard.
 * - "internal": Mainline's own read-only queries; plain machine-readable output.
 */
export function sandboxEnv(mode: 'user' | 'internal'): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of INHERITED_GIT_VARS) delete env[name];

  Object.assign(env, {
    GIT_CONFIG_GLOBAL: paths.gitconfig,
    // Stop git from walking up into a repository that contains this project.
    GIT_CEILING_DIRECTORIES: paths.root,
    GIT_TERMINAL_PROMPT: '0',
    // No terminal is attached, so "open an editor" must succeed without one.
    GIT_EDITOR: 'true',
    GIT_SEQUENCE_EDITOR: 'true',
    GIT_MERGE_AUTOEDIT: 'no',
    GIT_PAGER: 'cat',
    PAGER: 'cat',
    GH_PAGER: 'cat',
    GH_PROMPT_DISABLED: '1',
    GH_NO_UPDATE_NOTIFIER: '1',
    GH_SPINNER_DISABLED: '1',
  });

  if (mode === 'user') {
    delete env.NO_COLOR;
    Object.assign(env, { CLICOLOR_FORCE: '1', GH_FORCE_TTY: '100', TERM: 'xterm-256color', COLUMNS: '100' });
  } else {
    delete env.CLICOLOR_FORCE;
    delete env.GH_FORCE_TTY;
    Object.assign(env, { NO_COLOR: '1', GIT_OPTIONAL_LOCKS: '0' });
  }
  return env;
}

/** Resolves a learner-supplied path and guarantees it stays inside the playground. */
export function resolveInside(relative: string): string {
  if (relative.includes('\0')) throw new SandboxPathError('Invalid path.');
  const absolute = path.resolve(paths.repoDir, relative);
  const back = path.relative(paths.repoDir, absolute);
  if (back.startsWith('..') || path.isAbsolute(back)) {
    throw new SandboxPathError(`"${relative}" is outside the playground folder.`);
  }
  return absolute;
}

/** Like resolveInside, and also refuses paths that escape through a symlink. */
export async function resolveInsideChecked(relative: string): Promise<string> {
  const absolute = resolveInside(relative);
  const realRoot = await fs.realpath(paths.repoDir);
  let probe = absolute;
  while (probe !== paths.repoDir && !(await exists(probe))) probe = path.dirname(probe);
  const realProbe = await fs.realpath(probe);
  const back = path.relative(realRoot, realProbe);
  if (back.startsWith('..') || path.isAbsolute(back)) {
    throw new SandboxPathError(`"${relative}" leads outside the playground folder.`);
  }
  return absolute;
}

export function isInsideGitDir(absolute: string): boolean {
  return path.relative(paths.repoDir, absolute).split(path.sep)[0] === '.git';
}

/** Path relative to the playground, always with forward slashes (as git prints them). */
export function toRepoPath(absolute: string): string {
  return path.relative(paths.repoDir, absolute).split(path.sep).join('/');
}
