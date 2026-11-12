import type {
  ApiError,
  FileContent,
  FileDiff,
  GitHubState,
  RepoSnapshot,
  ResetRequest,
  ResetResponse,
  RunEvent,
  RunRequest,
  SystemInfo,
  WriteFileRequest,
} from '@mainline/shared';

export class ApiFailure extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiFailure(0, 'The Mainline server is not reachable.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(response.status, body?.error ?? `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  system: () => request<SystemInfo>('/api/system'),
  snapshot: () => request<RepoSnapshot>('/api/snapshot'),
  github: () => request<GitHubState>('/api/github'),
  reset: (body: ResetRequest) => request<ResetResponse>('/api/sandbox/reset', json('POST', body)),
  readFile: (path: string) => request<FileContent>(`/api/files/content?path=${encodeURIComponent(path)}`),
  readDiff: (path: string) => request<FileDiff>(`/api/files/diff?path=${encodeURIComponent(path)}`),
  writeFile: (body: WriteFileRequest) => request<RepoSnapshot>('/api/files/content', json('PUT', body)),

  /** Runs a command and yields each event as the server streams it. */
  async *run(body: RunRequest, signal: AbortSignal): AsyncGenerator<RunEvent> {
    let response: Response;
    try {
      response = await fetch('/api/run', { ...json('POST', body), signal });
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      throw new ApiFailure(0, 'The Mainline server is not reachable.');
    }
    if (!response.ok || !response.body) {
      const failure = (await response.json().catch(() => null)) as ApiError | null;
      throw new ApiFailure(response.status, failure?.error ?? `Request failed (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    for (;;) {
      const { done, value } = await reader.read();
      buffered += decoder.decode(value, { stream: !done });
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      for (const line of lines) if (line) yield JSON.parse(line) as RunEvent;
      if (done) break;
    }
    if (buffered.trim()) yield JSON.parse(buffered) as RunEvent;
  },
};
