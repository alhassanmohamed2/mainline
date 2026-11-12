import { createApp } from './app.ts';
import { config } from './config.ts';
import { readSystemInfo } from './git/system.ts';
import { ensureWorkspace, paths } from './sandbox/workspace.ts';

await ensureWorkspace();
const system = await readSystemInfo();

// `npm run dev` serves the page through Vite; this process then only answers the API.
const dev = process.argv.includes('--dev');

const server = createApp();
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Set MAINLINE_PORT to a free port and start again (see the README).`);
    process.exit(1);
  }
  throw error;
});

server.listen(config.port, config.host, () => {
  const check = (ok: boolean) => (ok ? 'ok' : 'MISSING');
  console.log(
    [
      '',
      dev
        ? `  Mainline (development): open http://localhost:${config.webPort}`
        : `  Mainline is running at http://localhost:${config.port}`,
      '',
      `  git   ${check(system.git !== null)}${system.git ? `  ${system.git.version}` : '  install git first (see README)'}`,
      `  gh    ${check(system.gh.installed)}${system.gh.installed ? `  ${system.gh.version}${system.gh.loggedIn ? '' : '  (not logged in: run "gh auth login")'}` : '  optional, needed for the GitHub chapters'}`,
      `  sandbox  ${paths.repoDir}`,
      '',
    ].join('\n'),
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    process.exit(0);
  });
}
