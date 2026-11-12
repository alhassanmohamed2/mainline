import { capture, type Captured } from '../exec/capture.ts';
import { paths, sandboxEnv } from '../sandbox/workspace.ts';

/** Runs one of Mainline's own read-only git queries in the playground. */
export function git(args: string[], input?: string): Promise<Captured> {
  return capture('git', ['-c', 'color.ui=never', '-c', 'core.quotePath=false', ...args], {
    cwd: paths.repoDir,
    env: sandboxEnv('internal'),
    input,
  });
}

/** Runs a read-only gh query and returns machine-readable output. */
export function gh(args: string[], timeoutMs = 20_000): Promise<Captured> {
  return capture('gh', args, { cwd: paths.repoDir, env: sandboxEnv('internal'), timeoutMs });
}

export const lines = (text: string): string[] => text.split('\n').filter((line) => line.length > 0);
export const nulSeparated = (text: string): string[] => text.split('\0').filter((part) => part.length > 0);
