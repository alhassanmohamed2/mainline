import { spawn } from 'node:child_process';

export interface Captured {
  /** 127 when the program could not be started at all. */
  code: number;
  stdout: string;
  stderr: string;
}

export interface CaptureOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

/** Runs a program to completion and collects its output. Never rejects. */
export function capture(program: string, args: string[], options: CaptureOptions): Promise<Captured> {
  return new Promise((resolve) => {
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let settled = false;
    const finish = (result: Captured) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const child = spawn(program, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), options.timeoutMs ?? 15_000);

    child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', () => finish({ code: 127, stdout: '', stderr: `${program}: command not found` }));
    child.on('close', (code) =>
      finish({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      }),
    );
    child.stdin.on('error', () => {});
    child.stdin.end(options.input ?? '');
  });
}
