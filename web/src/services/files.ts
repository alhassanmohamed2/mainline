import { api, ApiFailure } from '../api/client.ts';
import { useRepoStore } from '../state/repoStore.ts';

/** Writes the editor's text to the real file. Returns an error message, or null. */
export async function saveFile(path: string, content: string): Promise<string | null> {
  try {
    const snapshot = await api.writeFile({ path, content });
    useRepoStore.getState().applySnapshot(snapshot, `saved ${path} in the editor`);
    return null;
  } catch (error) {
    return error instanceof ApiFailure ? error.message : 'The file could not be saved.';
  }
}
