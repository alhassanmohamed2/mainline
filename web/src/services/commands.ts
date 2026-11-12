import type { RunEvent } from '@mainline/shared';
import { api, ApiFailure } from '../api/client.ts';
import { useRepoStore } from '../state/repoStore.ts';
import { useTerminalStore, type TerminalEntry } from '../state/terminalStore.ts';
import { useUiStore } from '../state/uiStore.ts';
import { promptFor, refreshGitHub, refreshSnapshot, refreshSystem } from './session.ts';

export interface RunOutcome {
  /** The program actually started (as opposed to rejected, cancelled or busy). */
  ran: boolean;
  exitCode: number | null;
}

const NOT_RUN: RunOutcome = { ran: false, exitCode: null };

let abortController: AbortController | null = null;

/** Commands after which GitHub's view of the repository may have changed. */
const TOUCHES_GITHUB = /^(gh\s|git\s+(push|pull|fetch|remote|clone)\b)/;

/**
 * Sends one command line to the server, mirrors everything that happens into
 * the terminal, and applies the repository snapshot that follows it.
 */
export async function runCommand(command: string, origin: TerminalEntry['origin'] = 'typed'): Promise<RunOutcome> {
  const line = command.trim();
  const terminal = useTerminalStore.getState();
  if (!line || terminal.running) return NOT_RUN;

  const repo = useRepoStore.getState();
  const id = terminal.begin({ prompt: promptFor(repo.system, repo.snapshot), command: line, origin });
  if (origin === 'typed') terminal.remember(line);
  terminal.setRunning(true);

  const patch = (changes: Partial<TerminalEntry>) => useTerminalStore.getState().patch(id, changes);
  let outcome = NOT_RUN;
  let confirmed = false;

  try {
    // At most two passes: the second one after the learner approved a remote change.
    for (;;) {
      abortController = new AbortController();
      let confirmation: Extract<RunEvent, { type: 'confirm' }> | null = null;

      for await (const event of api.run({ command: line, confirmed }, abortController.signal)) {
        switch (event.type) {
          case 'start':
            patch({ impact: event.impact });
            break;
          case 'output':
            useTerminalStore.getState().append(id, event.data);
            break;
          case 'exit':
            patch({ status: 'done', exitCode: event.code, durationMs: event.durationMs });
            outcome = { ran: true, exitCode: event.code };
            break;
          case 'rejected':
            patch({ status: 'rejected', note: { reason: event.reason, hint: event.hint } });
            break;
          case 'confirm':
            confirmation = event;
            break;
          case 'snapshot':
            useRepoStore.getState().applySnapshot(event.snapshot, line);
            break;
        }
      }

      if (!confirmation) break;
      const approved = await useUiStore.getState().askConfirm({
        command: line,
        title: confirmation.title,
        details: confirmation.details,
        danger: confirmation.danger,
      });
      if (!approved) {
        patch({ status: 'cancelled', note: { reason: 'Not run: you cancelled it.' } });
        break;
      }
      confirmed = true;
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      patch({ status: 'stopped', note: { reason: 'Stopped.' } });
      // The server ends the program a moment after the connection drops.
      setTimeout(() => void refreshSnapshot(), 400);
    } else {
      const reason = error instanceof ApiFailure ? error.message : 'The connection to the server was lost.';
      patch({ status: 'rejected', note: { reason, hint: 'Check that the Mainline server is still running.' } });
      if (error instanceof ApiFailure && error.status === 0) useRepoStore.getState().setOffline(reason);
    }
  } finally {
    abortController = null;
    useTerminalStore.getState().setRunning(false);
    // An entry still marked running means the stream ended without an exit event.
    const entry = useTerminalStore.getState().entries.find((candidate) => candidate.id === id);
    if (entry?.status === 'running') patch({ status: 'stopped', note: { reason: 'The command ended unexpectedly.' } });
  }

  if (outcome.ran && TOUCHES_GITHUB.test(line)) {
    void refreshGitHub();
    if (/^gh\s+auth\b/.test(line)) void refreshSystem();
  }
  return outcome;
}

export function stopCommand(): void {
  abortController?.abort();
}
