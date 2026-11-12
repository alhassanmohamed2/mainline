import path from 'node:path';
import type { SystemInfo } from '@mainline/shared';
import { capture } from '../exec/capture.ts';
import { ensureWorkspace, paths, sandboxEnv } from '../sandbox/workspace.ts';

interface ToolStatus {
  git: SystemInfo['git'];
  gh: SystemInfo['gh'];
}

const CACHE_MS = 30_000;
let cached: { at: number; value: ToolStatus } | null = null;

async function probeTools(): Promise<ToolStatus> {
  const options = { cwd: paths.root, env: sandboxEnv('internal'), timeoutMs: 10_000 };
  const [gitVersion, ghVersion, ghAuth] = await Promise.all([
    capture('git', ['--version'], options),
    capture('gh', ['--version'], options),
    capture('gh', ['auth', 'status', '--hostname', 'github.com'], options),
  ]);

  const ghInstalled = ghVersion.code === 0;
  const authText = `${ghAuth.stdout}\n${ghAuth.stderr}`;
  const loggedIn = ghInstalled && ghAuth.code === 0;

  return {
    git: gitVersion.code === 0 ? { version: gitVersion.stdout.replace('git version', '').trim() } : null,
    gh: {
      installed: ghInstalled,
      version: ghInstalled ? (/gh version (\S+)/.exec(ghVersion.stdout)?.[1] ?? null) : null,
      loggedIn,
      user: loggedIn ? (/account (\S+)/.exec(authText)?.[1] ?? null) : null,
    },
  };
}

export function forgetSystemInfo(): void {
  cached = null;
}

export async function readSystemInfo(): Promise<SystemInfo> {
  const meta = await ensureWorkspace();
  if (!cached || Date.now() - cached.at > CACHE_MS) cached = { at: Date.now(), value: await probeTools() };
  return {
    platform: process.platform,
    ...cached.value,
    sandbox: { path: paths.repoDir, dirName: path.basename(paths.repoDir), repoName: meta.repoName },
  };
}
