import { chapters } from '@mainline/curriculum';
import type { ResetRequest, ResetResponse, SetupLogLine } from '@mainline/shared';
import { tryAcquire } from '../exec/lock.ts';
import { execute } from '../exec/runner.ts';
import { takeSnapshot } from '../git/snapshot.ts';
import { readSystemInfo } from '../git/system.ts';
import { HttpError, readJson, sendJson, type Router } from '../http/router.ts';
import { resetWorkspace } from '../sandbox/workspace.ts';

/** Runs a chapter's setup script and reports each line. Stops at the first failure. */
export async function runSetup(commands: string[]): Promise<SetupLogLine[]> {
  const log: SetupLogLine[] = [];
  for (const command of commands) {
    let output = '';
    const result = await execute(command, { confirmed: false }, (event) => {
      if (event.type === 'output') output += event.data;
      if (event.type === 'rejected') output += event.reason;
      if (event.type === 'confirm') output += 'Setup scripts may not change a remote.';
    });
    const ok = result.ran && result.code === 0;
    log.push({ command, ok, output });
    if (!ok) break;
  }
  return log;
}

export function registerSandboxRoutes(router: Router): void {
  router.on('GET', '/api/system', async ({ res }) => {
    sendJson(res, 200, await readSystemInfo());
  });

  router.on('GET', '/api/snapshot', async ({ res }) => {
    sendJson(res, 200, await takeSnapshot());
  });

  /** POST /api/sandbox/reset — empties the playground, optionally rebuilding a chapter's starting state. */
  router.on('POST', '/api/sandbox/reset', async ({ req, res }) => {
    const body = await readJson<ResetRequest>(req);
    const chapter = body.chapterId ? chapters.find((entry) => entry.id === body.chapterId) : undefined;
    if (body.chapterId && !chapter) throw new HttpError(404, 'Unknown chapter.');
    if (chapter && !chapter.setup) throw new HttpError(409, 'This chapter continues from the previous one.');

    const release = tryAcquire();
    if (!release) throw new HttpError(409, 'A command is still running. Wait for it to finish first.');
    try {
      await resetWorkspace();
      const log = chapter?.setup ? await runSetup(chapter.setup) : [];
      const response: ResetResponse = { snapshot: await takeSnapshot(), system: await readSystemInfo(), log };
      sendJson(res, 200, response);
    } finally {
      release();
    }
  });
}
