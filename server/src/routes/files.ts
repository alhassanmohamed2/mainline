import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileContent, FileDiff, WriteFileRequest } from '@mainline/shared';
import { config } from '../config.ts';
import { tryAcquire } from '../exec/lock.ts';
import { git } from '../git/query.ts';
import { takeSnapshot } from '../git/snapshot.ts';
import { HttpError, readJson, sendJson, type Router } from '../http/router.ts';
import { isInsideGitDir, resolveInsideChecked, SandboxPathError, toRepoPath } from '../sandbox/workspace.ts';

async function resolveParam(raw: string | null): Promise<string> {
  if (!raw) throw new HttpError(400, 'Missing path.');
  try {
    return await resolveInsideChecked(raw);
  } catch (error) {
    if (error instanceof SandboxPathError) throw new HttpError(400, error.message);
    throw error;
  }
}

export function registerFileRoutes(router: Router): void {
  router.on('GET', '/api/files/content', async ({ url, res }) => {
    const absolute = await resolveParam(url.searchParams.get('path'));
    const file: FileContent = { path: toRepoPath(absolute), exists: false, binary: false, tooLarge: false, content: '' };
    try {
      const buffer = await fs.readFile(absolute);
      file.exists = true;
      file.tooLarge = buffer.length > config.maxFileBytes;
      file.binary = buffer.includes(0);
      if (!file.tooLarge && !file.binary) file.content = buffer.toString('utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EISDIR') throw new HttpError(400, 'That is a folder.');
    }
    sendJson(res, 200, file);
  });

  router.on('GET', '/api/files/diff', async ({ url, res }) => {
    const absolute = await resolveParam(url.searchParams.get('path'));
    const repoPath = toRepoPath(absolute);
    const [unstaged, staged] = await Promise.all([
      git(['diff', '--', repoPath]),
      git(['diff', '--staged', '--', repoPath]),
    ]);
    const diff: FileDiff = {
      path: repoPath,
      unstaged: unstaged.code === 0 ? unstaged.stdout : '',
      staged: staged.code === 0 ? staged.stdout : '',
    };
    sendJson(res, 200, diff);
  });

  /** PUT /api/files/content — saves the editor's text into the real file. */
  router.on('PUT', '/api/files/content', async ({ req, res }) => {
    const body = await readJson<WriteFileRequest>(req);
    if (typeof body.content !== 'string') throw new HttpError(400, 'Missing content.');
    const absolute = await resolveParam(body.path);
    if (isInsideGitDir(absolute)) throw new HttpError(400, 'Files inside .git belong to git.');

    const release = tryAcquire();
    if (!release) throw new HttpError(409, 'A command is still running. Wait for it to finish first.');
    try {
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, body.content, 'utf8');
      sendJson(res, 200, await takeSnapshot());
    } finally {
      release();
    }
  });
}
