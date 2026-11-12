import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');

const port = Number(process.env.MAINLINE_PORT ?? 4477);
const webPort = Number(process.env.MAINLINE_WEB_PORT ?? 5177);

export const config = {
  projectRoot,
  /** Loopback only: this server runs real commands and must never be reachable from the network. */
  host: '127.0.0.1',
  port,
  webPort,
  /** Browser origins allowed to call the API (the built app, and Vite in development). */
  allowedOrigins: [port, webPort].flatMap((p) => [`http://localhost:${p}`, `http://127.0.0.1:${p}`]),
  sandboxRoot: path.resolve(process.env.MAINLINE_SANDBOX ?? path.join(projectRoot, '.sandbox')),
  webDist: path.join(projectRoot, 'web', 'dist'),
  commandTimeoutMs: 120_000,
  /** Output beyond this is cut off so a runaway command cannot flood the page. */
  maxOutputBytes: 400_000,
  maxFileBytes: 400_000,
  maxCommits: 300,
  maxWorktreeFiles: 400,
  reflogDepth: 60,
} as const;
