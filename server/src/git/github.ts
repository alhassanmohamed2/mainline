import type { GitHubIssue, GitHubPullRequest, GitHubState } from '@mainline/shared';
import { gh } from './query.ts';
import { readRemotes } from './remotes.ts';

function parse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** What GitHub currently knows about the repository behind the playground's remote. */
export async function readGitHubState(): Promise<GitHubState> {
  const remotes = await readRemotes();
  const remote = remotes.find((entry) => entry.name === 'origin' && entry.github) ?? remotes.find((entry) => entry.github);
  if (!remote?.github) return { connected: false };

  const nameWithOwner = `${remote.github.owner}/${remote.github.repo}`;
  const url = remote.github.webUrl;

  const [repo, prs, issues] = await Promise.all([
    gh(['repo', 'view', nameWithOwner, '--json', 'visibility,defaultBranchRef']),
    gh(['pr', 'list', '-R', nameWithOwner, '--state', 'all', '--limit', '20', '--json', 'number,title,state,isDraft,headRefName,baseRefName,url']),
    gh(['issue', 'list', '-R', nameWithOwner, '--state', 'all', '--limit', '20', '--json', 'number,title,state,url']),
  ]);

  const repoInfo = repo.code === 0 ? parse<{ visibility: string; defaultBranchRef: { name: string } | null }>(repo.stdout) : null;
  if (!repoInfo) {
    const error = (repo.stderr || 'GitHub did not answer.').trim().split('\n')[0]!;
    return { connected: true, ok: false, nameWithOwner, url, error };
  }

  return {
    connected: true,
    ok: true,
    nameWithOwner,
    url,
    visibility: repoInfo.visibility,
    defaultBranch: repoInfo.defaultBranchRef?.name || null,
    pullRequests: (prs.code === 0 && parse<GitHubPullRequest[]>(prs.stdout)) || [],
    issues: (issues.code === 0 && parse<GitHubIssue[]>(issues.stdout)) || [],
  };
}
