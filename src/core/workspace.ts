import fs from "node:fs/promises";
import path from "node:path";
import type { Forest } from "../types.js";

export function workspaceFileName(forestName: string): string {
  return `${forestName}.code-workspace`;
}

export async function writeWorkspaceFile(forest: Forest): Promise<void> {
  const filePath = path.join(forest.path, workspaceFileName(forest.name));
  const doc = {
    folders: forest.worktrees.map((wt) => ({
      name: wt.repo.name,
      path: wt.repo.name,
    })),
    settings: {},
  };
  await fs.writeFile(filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

export async function removeWorkspaceFile(forestPath: string, name: string): Promise<void> {
  const filePath = path.join(forestPath, workspaceFileName(name));
  try {
    await fs.unlink(filePath);
  } catch {
    /* ignore */
  }
}

export async function renameWorkspaceFile(
  forestPath: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const oldFile = path.join(forestPath, workspaceFileName(oldName));
  const newFile = path.join(forestPath, workspaceFileName(newName));
  try {
    await fs.rename(oldFile, newFile);
  } catch {
    /* ignore — will be rewritten by writeWorkspaceFile */
  }
}

