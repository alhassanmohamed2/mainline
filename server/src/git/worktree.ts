import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.ts';
import { paths } from '../sandbox/workspace.ts';

export interface WorktreeListing {
  /** Paths relative to the playground, forward slashes, sorted. */
  files: string[];
  truncated: boolean;
}

/** Lists every file in the playground, leaving out git's own storage. */
export async function listWorktree(): Promise<WorktreeListing> {
  const files: string[] = [];
  let truncated = false;

  const walk = async (directory: string, prefix: string): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= config.maxWorktreeFiles) {
        truncated = true;
        return;
      }
      if (entry.name === '.git') continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
    }
  };

  await walk(paths.repoDir, '');
  return { files, truncated };
}
