import { readGitHubState } from '../git/github.ts';
import { sendJson, type Router } from '../http/router.ts';

export function registerGitHubRoutes(router: Router): void {
  router.on('GET', '/api/github', async ({ res }) => {
    sendJson(res, 200, await readGitHubState());
  });
}
