import type { Chapter } from '@mainline/curriculum';
import type { RepoSnapshot, SystemInfo } from '@mainline/shared';

export interface StartingPointCheck {
  /** ok: go ahead. rebuild: the sandbox is in another state. blocked: something outside the sandbox is missing. */
  status: 'ok' | 'rebuild' | 'blocked';
  message: string | null;
}

const OK: StartingPointCheck = { status: 'ok', message: null };

/** Does the playground look like the place this chapter starts from? */
export function checkStartingPoint(
  chapter: Chapter,
  snapshot: RepoSnapshot | null,
  system: SystemInfo | null,
): StartingPointCheck {
  if (!snapshot || !system) return OK;

  if (chapter.needs) {
    if (!system.gh.installed) {
      return { status: 'blocked', message: 'This chapter needs the GitHub CLI (`gh`). Install it (see the README), then reload this page.' };
    }
    if (!system.gh.loggedIn) {
      return { status: 'blocked', message: 'gh is not logged in. Run `gh auth login` in your own terminal, then reload this page.' };
    }
  }
  if (chapter.needs === 'github-remote' && !snapshot.remotes.some((remote) => remote.github)) {
    return { status: 'blocked', message: 'This chapter continues where chapter 7 ends: with the playground connected to a GitHub repository.' };
  }

  const requires = chapter.requires;
  if (!requires) return OK;

  if (requires.repo === 'absent' && snapshot.exists) {
    return { status: 'rebuild', message: 'The playground is already a repository. This chapter starts from an empty folder.' };
  }
  if ((requires.repo === 'present' || requires.files || requires.branches) && !snapshot.exists) {
    return { status: 'rebuild', message: 'The playground is not a repository yet.' };
  }
  const committed = new Set(snapshot.headTree.map((entry) => entry.path));
  if (requires.files?.some((file) => !committed.has(file))) {
    return { status: 'rebuild', message: 'The playground does not have the commits this chapter builds on.' };
  }
  const branches = new Set(snapshot.branches.map((branch) => branch.name));
  if (requires.branches?.some((branch) => !branches.has(branch))) {
    return { status: 'rebuild', message: 'The playground does not have the branches this chapter works with.' };
  }
  return OK;
}
