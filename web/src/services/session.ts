import type { TemplateValues } from '@mainline/curriculum';
import type { RepoSnapshot, SystemInfo } from '@mainline/shared';
import { api, ApiFailure } from '../api/client.ts';
import { shortSha } from '../lib/format.ts';
import { useRepoStore } from '../state/repoStore.ts';
import { useTerminalStore } from '../state/terminalStore.ts';
import { useUiStore } from '../state/uiStore.ts';

/** Loads everything the page needs to draw its first frame. */
export async function boot(): Promise<void> {
  const repo = useRepoStore.getState();
  try {
    const [system, snapshot] = await Promise.all([api.system(), api.snapshot()]);
    repo.setSystem(system);
    repo.applySnapshot(snapshot, null);
    void refreshGitHub();
  } catch (error) {
    repo.setOffline(error instanceof ApiFailure ? error.message : 'Something went wrong while loading.');
  }
}

/**
 * Re-reads the repository without attributing the change to a command. Used
 * when the learner may have changed the folder outside Mainline.
 */
export async function refreshSnapshot(): Promise<void> {
  if (useTerminalStore.getState().running) return;
  try {
    useRepoStore.getState().applySnapshot(await api.snapshot(), null);
  } catch {
    // The next command will surface a connection problem.
  }
}

export async function refreshSystem(): Promise<void> {
  try {
    useRepoStore.getState().setSystem(await api.system());
  } catch {
    // keep what we have
  }
}

let githubRequest = 0;

/** Asks GitHub (through gh) about the repository behind the playground's remote. */
export async function refreshGitHub(): Promise<void> {
  const ui = useUiStore.getState();
  const snapshot = useRepoStore.getState().snapshot;
  if (!snapshot?.remotes.some((remote) => remote.github)) {
    ui.setGitHub({ connected: false }, false);
    return;
  }
  const request = (githubRequest += 1);
  ui.setGitHub(ui.github, true);
  try {
    const state = await api.github();
    if (request === githubRequest) useUiStore.getState().setGitHub(state, false);
  } catch {
    if (request === githubRequest) useUiStore.getState().setGitHub(useUiStore.getState().github, false);
  }
}

/** The shell-style prompt for the current state, e.g. "playground (main)". */
export function promptFor(system: SystemInfo | null, snapshot: RepoSnapshot | null): string {
  const folder = system?.sandbox.dirName ?? 'playground';
  const head = snapshot?.head;
  if (!head) return folder;
  return `${folder} (${head.kind === 'detached' ? shortSha(head.sha) : head.branch})`;
}

/** Values for {{placeholders}} in lesson commands. An existing GitHub remote wins. */
export function templateValues(system: SystemInfo | null, snapshot: RepoSnapshot | null): TemplateValues {
  const origin = snapshot?.remotes.find((remote) => remote.name === 'origin')?.github;
  return {
    ghUser: origin?.owner ?? system?.gh.user ?? null,
    repoName: origin?.repo ?? system?.sandbox.repoName ?? 'mainline-playground',
  };
}
