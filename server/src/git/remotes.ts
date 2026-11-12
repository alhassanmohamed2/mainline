import type { GitHubRemote, RemoteInfo } from '@mainline/shared';
import { git, lines } from './query.ts';

const GITHUB_URL_PATTERNS = [
  /^https?:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
  /^ssh:\/\/git@github\.com(?::\d+)?\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
];

export function parseGitHubUrl(url: string): GitHubRemote | null {
  for (const pattern of GITHUB_URL_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      const [, owner, repo] = match;
      return { owner: owner!, repo: repo!, webUrl: `https://github.com/${owner}/${repo}` };
    }
  }
  return null;
}

export async function readRemotes(): Promise<RemoteInfo[]> {
  const result = await git(['config', '--get-regexp', '^remote\\..*\\.url$']);
  if (result.code !== 0) return [];
  return lines(result.stdout).map((line) => {
    const space = line.indexOf(' ');
    const name = line.slice('remote.'.length, space - '.url'.length);
    const url = line.slice(space + 1);
    return { name, url, github: parseGitHubUrl(url) };
  });
}
