import { chapters } from '@mainline/curriculum';
import { api, ApiFailure } from '../api/client.ts';
import { useLessonStore } from '../state/lessonStore.ts';
import { useRepoStore } from '../state/repoStore.ts';
import { useTerminalStore } from '../state/terminalStore.ts';
import { useUiStore } from '../state/uiStore.ts';
import { promptFor, refreshGitHub } from './session.ts';

/**
 * Empties the playground folder. With a chapter id, the server then replays
 * that chapter's setup commands so the lesson can start from a known state.
 * Returns an error message, or null when it worked.
 */
export async function resetSandbox(chapterId: string | null): Promise<string | null> {
  const chapter = chapterId ? chapters.find((entry) => entry.id === chapterId) : undefined;
  try {
    const response = await api.reset(chapterId ? { chapterId } : {});
    const repo = useRepoStore.getState();
    repo.setSystem(response.system);
    repo.applySnapshot(response.snapshot, null);
    useRepoStore.setState({ effects: [], effectsCause: null });

    const lesson = useLessonStore.getState();
    if (chapter) {
      lesson.forgetChapter(chapter.id);
      lesson.openChapter(chapter.id);
    } else {
      lesson.forgetAll();
    }

    const ui = useUiStore.getState();
    ui.selectCommit(null);
    ui.closeEditor();
    void refreshGitHub();

    useTerminalStore
      .getState()
      .addSetupEntry(
        promptFor(response.system, null),
        chapter ? `Sandbox rebuilt for chapter ${chapter.number}: ${chapter.title}` : 'Sandbox emptied',
        response.log,
      );
    const failed = response.log.find((line) => !line.ok);
    return failed ? `Setup stopped at "${failed.command}".` : null;
  } catch (error) {
    return error instanceof ApiFailure ? error.message : 'The sandbox could not be reset.';
  }
}
