import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import type { RunEvent } from '@mainline/shared';
import { config } from '../config.ts';
import { paths, sandboxEnv } from '../sandbox/workspace.ts';
import { runBuiltin } from './builtins.ts';
import { plan } from './policy.ts';
import { CommandSyntaxError, tokenize } from './tokenize.ts';

export interface ExecuteOptions {
  confirmed: boolean;
  /** Aborting kills the running program (the browser went away, or pressed stop). */
  signal?: AbortSignal;
}

export interface ExecuteResult {
  /** False when the command was rejected or is waiting for confirmation. */
  ran: boolean;
  code: number | null;
}

const INSTALL_HINTS: Record<string, string> = {
  git: 'git is not installed or not on your PATH. See the README for install steps.',
  gh: 'The GitHub CLI (gh) is not installed or not on your PATH. See the README for install steps.',
};

/**
 * Runs one command line in the playground and reports everything that happens
 * through `emit`, as it happens.
 */
export async function execute(
  line: string,
  options: ExecuteOptions,
  emit: (event: RunEvent) => void,
): Promise<ExecuteResult> {
  let planned;
  try {
    planned = plan(tokenize(line));
  } catch (error) {
    if (!(error instanceof CommandSyntaxError)) throw error;
    emit({ type: 'rejected', reason: error.message, hint: error.hint });
    return { ran: false, code: null };
  }

  if (planned.kind === 'reject') {
    emit({ type: 'rejected', reason: planned.reason, hint: planned.hint });
    return { ran: false, code: null };
  }

  const started = Date.now();

  if (planned.kind === 'builtin') {
    emit({ type: 'start', program: planned.name, impact: 'local' });
    const result = await runBuiltin(planned.name, planned.args, planned.redirect);
    if (result.stdout) emit({ type: 'output', stream: 'stdout', data: result.stdout });
    if (result.stderr) emit({ type: 'output', stream: 'stderr', data: result.stderr });
    emit({ type: 'exit', code: result.code, durationMs: Date.now() - started, timedOut: false });
    return { ran: true, code: result.code };
  }

  if (planned.confirmation && !options.confirmed) {
    emit({ type: 'confirm', ...planned.confirmation });
    return { ran: false, code: null };
  }

  emit({ type: 'start', program: planned.program, impact: planned.impact });
  const { program, args } = planned;

  const code = await new Promise<{ code: number | null; timedOut: boolean }>((resolve) => {
    const posix = process.platform !== 'win32';
    const child = spawn(program, args, {
      cwd: paths.repoDir,
      env: sandboxEnv('user'),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      // Own process group, so helpers the program starts are stopped with it.
      detached: posix,
    });

    let settled = false;
    let timedOut = false;
    let emittedBytes = 0;
    let truncated = false;

    const stop = () => {
      if (child.pid === undefined || child.exitCode !== null) return;
      try {
        if (posix) process.kill(-child.pid, 'SIGTERM');
        else child.kill();
      } catch {
        // already gone
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, config.commandTimeoutMs);
    options.signal?.addEventListener('abort', stop, { once: true });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', stop);
      resolve({ code: exitCode, timedOut });
    };

    const forward = (stream: 'stdout' | 'stderr') => {
      const decoder = new StringDecoder('utf8');
      return (chunk: Buffer) => {
        if (truncated) return;
        emittedBytes += chunk.length;
        if (emittedBytes > config.maxOutputBytes) {
          truncated = true;
          emit({ type: 'output', stream: 'stderr', data: '\n[output cut off: too long to show]\n' });
          return;
        }
        const data = decoder.write(chunk);
        if (data) emit({ type: 'output', stream, data });
      };
    };

    child.stdout.on('data', forward('stdout'));
    child.stderr.on('data', forward('stderr'));
    child.on('error', (error: NodeJS.ErrnoException) => {
      const message = error.code === 'ENOENT' ? INSTALL_HINTS[program] : `Could not start ${program}: ${error.message}`;
      emit({ type: 'output', stream: 'stderr', data: `${message}\n` });
      finish(127);
    });
    child.on('close', (exitCode) => finish(exitCode));
  });

  if (code.timedOut) {
    emit({
      type: 'output',
      stream: 'stderr',
      data: `\n[stopped after ${Math.round(config.commandTimeoutMs / 1000)}s: the command did not finish]\n`,
    });
  }
  emit({ type: 'exit', code: code.code, durationMs: Date.now() - started, timedOut: code.timedOut });
  return { ran: true, code: code.code };
}
