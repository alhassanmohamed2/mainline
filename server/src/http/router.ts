import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}

export type Handler = (context: Context) => Promise<void> | void;

/** Exact-path routing: the API is small enough not to need more. */
export class Router {
  private routes = new Map<string, Handler>();

  on(method: 'GET' | 'POST' | 'PUT', pathname: string, handler: Handler): this {
    this.routes.set(`${method} ${pathname}`, handler);
    return this;
  }

  find(method: string, pathname: string): Handler | undefined {
    return this.routes.get(`${method} ${pathname}`);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

export async function readJson<T>(req: IncomingMessage, maxBytes = 1_000_000): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as T;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}
