import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { config } from '../config.ts';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function isFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

/** Serves the built web app; unknown paths fall back to index.html. */
export async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  const requested = path.join(config.webDist, path.normalize(decodeURIComponent(pathname)));
  const insideDist = requested === config.webDist || requested.startsWith(config.webDist + path.sep);
  const indexFile = path.join(config.webDist, 'index.html');
  const file = insideDist && (await isFile(requested)) ? requested : indexFile;

  if (!(await isFile(file))) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('The web app has not been built yet.\nRun "npm run build", or use "npm run dev" and open the address it prints.\n');
    return;
  }

  const hashed = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}
