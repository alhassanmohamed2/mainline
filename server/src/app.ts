import { createServer, type Server } from 'node:http';
import { assertTrustedRequest } from './http/guards.ts';
import { HttpError, Router, sendJson } from './http/router.ts';
import { serveStatic } from './http/static.ts';
import { registerFileRoutes } from './routes/files.ts';
import { registerGitHubRoutes } from './routes/github.ts';
import { registerRunRoute } from './routes/run.ts';
import { registerSandboxRoutes } from './routes/sandbox.ts';

export function createApp(): Server {
  const router = new Router();
  registerSandboxRoutes(router);
  registerRunRoute(router);
  registerFileRoutes(router);
  registerGitHubRoutes(router);

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) {
        assertTrustedRequest(req);
        const handler = router.find(req.method ?? 'GET', url.pathname);
        if (!handler) throw new HttpError(404, 'No such endpoint.');
        await handler({ req, res, url });
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
      await serveStatic(url.pathname, res);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      if (res.headersSent) res.end();
      else sendJson(res, status, { error: error instanceof HttpError ? error.message : 'Something went wrong on the server.' });
    }
  });
}
