import type { IncomingMessage } from 'node:http';
import { config } from '../config.ts';
import { HttpError } from './router.ts';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * This API runs programs on the machine, so only the Mainline page itself may
 * call it. A web page from anywhere else is turned away, three ways:
 *
 * - Host must be a loopback name (defeats DNS rebinding).
 * - Origin, when the browser sends one, must be Mainline's own.
 * - Requests with a body must be JSON, which browsers refuse to send
 *   cross-site without a permission this server never grants.
 */
export function assertTrustedRequest(req: IncomingMessage): void {
  const hostname = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
  if (!LOCAL_HOSTNAMES.has(hostname)) throw new HttpError(403, 'Mainline only answers on localhost.');

  const origin = req.headers.origin;
  if (origin && !(config.allowedOrigins as readonly string[]).includes(origin)) {
    throw new HttpError(403, 'This origin may not call Mainline.');
  }

  if (req.headers['sec-fetch-site'] === 'cross-site') {
    throw new HttpError(403, 'Cross-site requests are not allowed.');
  }

  if (req.method !== 'GET' && !(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw new HttpError(415, 'Send JSON.');
  }
}
