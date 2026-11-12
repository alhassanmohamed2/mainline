import type { RunEvent, RunRequest } from '@mainline/shared';
import { tryAcquire } from '../exec/lock.ts';
import { execute } from '../exec/runner.ts';
import { takeSnapshot } from '../git/snapshot.ts';
import { forgetSystemInfo } from '../git/system.ts';
import { HttpError, readJson, type Router } from '../http/router.ts';

/**
 * POST /api/run — runs one command and streams what happens as
 * newline-delimited JSON, ending with a fresh snapshot of the repository.
 */
export function registerRunRoute(router: Router): void {
  router.on('POST', '/api/run', async ({ req, res }) => {
    const body = await readJson<RunRequest>(req);
    if (typeof body.command !== 'string' || body.command.length > 4_000) {
      throw new HttpError(400, 'Expected a command.');
    }

    res.writeHead(200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    });
    const emit = (event: RunEvent) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    };

    const release = tryAcquire();
    if (!release) {
      emit({ type: 'rejected', reason: 'Another command is still running.', hint: 'Wait for it to finish, or stop it.' });
      res.end();
      return;
    }

    // If the page goes away mid-command, stop the program it started.
    const abort = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) abort.abort();
    };
    res.on('close', onClose);

    try {
      const result = await execute(body.command.trim(), { confirmed: body.confirmed === true, signal: abort.signal }, emit);
      if (result.ran) {
        if (/^gh\s+auth\b/.test(body.command.trim())) forgetSystemInfo();
        emit({ type: 'snapshot', snapshot: await takeSnapshot() });
      }
    } finally {
      res.off('close', onClose);
      release();
      res.end();
    }
  });
}
