import fs from 'node:fs/promises';
import path from 'node:path';
import { isInsideGitDir, paths, resolveInsideChecked, SandboxPathError, toRepoPath } from '../sandbox/workspace.ts';
import type { BuiltinName, Redirect } from './policy.ts';

/**
 * File helpers implemented in Node rather than by a shell. They do real work
 * on real files, but only ever inside the playground folder.
 */

export interface BuiltinResult {
  code: number;
  stdout: string;
  stderr: string;
}

const ok = (stdout = ''): BuiltinResult => ({ code: 0, stdout, stderr: '' });
const fail = (stderr: string, code = 1): BuiltinResult => ({ code, stdout: '', stderr: `${stderr}\n` });

function splitFlags(args: string[]): { flags: Set<string>; operands: string[] } {
  const flags = new Set<string>();
  const operands: string[] = [];
  let flagsDone = false;
  for (const arg of args) {
    if (!flagsDone && arg === '--') flagsDone = true;
    else if (!flagsDone && /^-[A-Za-z]+$/.test(arg)) for (const letter of arg.slice(1)) flags.add(letter);
    else operands.push(arg);
  }
  return { flags, operands };
}

/** A path the learner may change. The repository's own files are off limits. */
async function writable(target: string): Promise<string> {
  const absolute = await resolveInsideChecked(target);
  if (isInsideGitDir(absolute)) {
    throw new SandboxPathError('Files inside .git belong to git. Change them with git commands.');
  }
  return absolute;
}

async function echo(args: string[], redirect: Redirect | null): Promise<BuiltinResult> {
  const noNewline = args[0] === '-n';
  const text = (noNewline ? args.slice(1) : args).join(' ') + (noNewline ? '' : '\n');
  if (!redirect) return ok(text);
  const target = await writable(redirect.target);
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (redirect.mode === 'append') await fs.appendFile(target, text, 'utf8');
  else await fs.writeFile(target, text, 'utf8');
  return ok();
}

async function cat(args: string[]): Promise<BuiltinResult> {
  if (args.length === 0) return fail('cat: which file?');
  let stdout = '';
  for (const arg of args) {
    const absolute = await resolveInsideChecked(arg);
    try {
      const buffer = await fs.readFile(absolute);
      stdout += buffer.includes(0) ? `(${arg} is a binary file, ${buffer.length} bytes)\n` : buffer.toString('utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      return fail(code === 'EISDIR' ? `cat: ${arg}: Is a directory` : `cat: ${arg}: No such file or directory`);
    }
  }
  return ok(stdout);
}

async function ls(args: string[]): Promise<BuiltinResult> {
  const { flags, operands } = splitFlags(args);
  const targets = operands.length > 0 ? operands : ['.'];
  const sections: string[] = [];

  for (const target of targets) {
    const absolute = await resolveInsideChecked(target);
    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch {
      return fail(`ls: cannot access '${target}': No such file or directory`, 2);
    }
    if (!stat.isDirectory()) {
      sections.push(target);
      continue;
    }
    const entries = await fs.readdir(absolute, { withFileTypes: true });
    const lines = entries
      .filter((entry) => flags.has('a') || !entry.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
    sections.push((targets.length > 1 ? `${target}:\n` : '') + lines.join('\n'));
  }
  const output = sections.filter(Boolean).join(targets.length > 1 ? '\n\n' : '\n');
  return ok(output ? `${output}\n` : '');
}

async function touch(args: string[]): Promise<BuiltinResult> {
  if (args.length === 0) return fail('touch: which file?');
  for (const arg of args) {
    const target = await writable(arg);
    const now = new Date();
    try {
      await fs.utimes(target, now, now);
    } catch {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, '', { flag: 'a' });
    }
  }
  return ok();
}

async function rm(args: string[]): Promise<BuiltinResult> {
  const { flags, operands } = splitFlags(args);
  if (operands.length === 0) return fail('rm: which file?');
  const recursive = flags.has('r') || flags.has('R');
  for (const operand of operands) {
    const absolute = await resolveInsideChecked(operand);
    if (absolute === paths.repoDir) return fail('rm: refusing to remove the playground folder itself. Use "Reset sandbox".');
    // Deleting .git as a whole is allowed: it is how a folder stops being a repository.
    if (isInsideGitDir(absolute) && toRepoPath(absolute) !== '.git') {
      return fail('rm: files inside .git belong to git.');
    }
    let stat;
    try {
      stat = await fs.lstat(absolute);
    } catch {
      if (flags.has('f')) continue;
      return fail(`rm: cannot remove '${operand}': No such file or directory`);
    }
    if (stat.isDirectory() && !recursive) return fail(`rm: cannot remove '${operand}': Is a directory (use rm -r)`);
    await fs.rm(absolute, { recursive, force: true });
  }
  return ok();
}

async function mkdir(args: string[]): Promise<BuiltinResult> {
  const { operands } = splitFlags(args);
  if (operands.length === 0) return fail('mkdir: which folder?');
  for (const operand of operands) await fs.mkdir(await writable(operand), { recursive: true });
  return ok();
}

async function mv(args: string[]): Promise<BuiltinResult> {
  const { operands } = splitFlags(args);
  if (operands.length !== 2) return fail('mv: expected a source and a destination');
  const source = await writable(operands[0]!);
  let destination = await writable(operands[1]!);
  try {
    if ((await fs.stat(destination)).isDirectory()) destination = path.join(destination, path.basename(source));
  } catch {
    // destination does not exist yet: plain rename
  }
  try {
    await fs.rename(source, destination);
  } catch {
    return fail(`mv: cannot move '${operands[0]}': No such file or directory`);
  }
  return ok();
}

const HELP = `Mainline runs real programs in the playground folder:

  git ...      any git command
  gh ...       the GitHub CLI (commands that change GitHub ask first)

File helpers (handled by Mainline, limited to the playground):

  echo "text" > file    write a file        echo "text" >> file   append to a file
  cat file              print a file        ls [-a] [folder]      list files
  touch file            create empty file   mkdir folder          create a folder
  mv from to            rename or move      rm [-r] path          delete
  pwd                   show the folder

One command per line. Pipes, && and variables are not available.
`;

export async function runBuiltin(name: BuiltinName, args: string[], redirect: Redirect | null): Promise<BuiltinResult> {
  try {
    switch (name) {
      case 'echo':
        return await echo(args, redirect);
      case 'cat':
        return await cat(args);
      case 'ls':
        return await ls(args);
      case 'touch':
        return await touch(args);
      case 'rm':
        return await rm(args);
      case 'mkdir':
        return await mkdir(args);
      case 'mv':
        return await mv(args);
      case 'pwd':
        return ok(`${paths.repoDir}\n`);
      case 'help':
        return ok(HELP);
    }
  } catch (error) {
    if (error instanceof SandboxPathError) return fail(`${name}: ${error.message}`);
    return fail(`${name}: ${(error as Error).message}`);
  }
}
