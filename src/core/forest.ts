import fs from "node:fs/promises";
import path from "node:path";
import { FOREST_META_FILE, WORKFOREST_ROOT } from "../constants.js";
import type {
  Forest,
  ForestFileV2,
  RepoRef,
  Worktree,
} from "../types.js";
import { forestPath } from "./paths.js";
import {
  gitBranchDelete,
  gitBranchRename,
  gitFetch,
  gitHasBranch,
  gitStatus,
  gitWorktreeAdd,
  gitWorktreeAttach,
  gitWorktreePrune,
  gitWorktreeRemove,
  gitWorktreeRepair,
  gitDefaultBranch,
} from "./git.js";
import {
  removeWorkspaceFile,
  renameWorkspaceFile,
  writeWorkspaceFile,
} from "./workspace.js";

async function ensureRoot(): Promise<void> {
  await fs.mkdir(WORKFOREST_ROOT, { recursive: true });
}

export async function listForests(): Promise<Forest[]> {
  await ensureRoot();
  const entries = await fs.readdir(WORKFOREST_ROOT);
  const loaded = await Promise.all(
    entries
      .filter((entry) => !entry.startsWith("."))
      .map(async (entry) => {
        const full = path.join(WORKFOREST_ROOT, entry);
        try {
          const stat = await fs.stat(full);
          if (!stat.isDirectory()) return null;
        } catch {
          return null;
        }
        return loadForestByPath(full);
      }),
  );
  const results = loaded.filter((f): f is Forest => f !== null);
  results.sort((a, b) => {
    const aDate = a.lastOpenedAt ?? a.createdAt;
    const bDate = b.lastOpenedAt ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
  return results;
}

async function loadForestByPath(forestDir: string): Promise<Forest | null> {
  const metaPath = path.join(forestDir, FOREST_META_FILE);
  const forestName = path.basename(forestDir);
  let data: ForestFileV2;
  try {
    const content = await fs.readFile(metaPath, "utf8");
    const parsed = JSON.parse(content) as ForestFileV2;
    if (parsed.version !== 2) return null;
    data = parsed;
  } catch {
    return null;
  }

  const worktrees: Worktree[] = await Promise.all(
    data.worktrees.map(async (wt) => {
      const wtPath = path.join(forestDir, wt.repoName);
      let exists = false;
      try {
        const st = await fs.stat(wtPath);
        exists = st.isDirectory();
      } catch {
        /* missing */
      }
      return {
        repo: {
          name: wt.repoName,
          relPath: wt.repoRelPath,
          absPath: wt.repoAbsPath,
        },
        path: wtPath,
        exists,
      };
    }),
  );
  return {
    name: forestName,
    path: forestDir,
    createdAt: data.createdAt,
    lastOpenedAt: data.lastOpenedAt,
    worktrees,
  };
}

export async function loadForest(name: string): Promise<Forest | null> {
  return loadForestByPath(forestPath(name));
}

async function saveForest(forest: Forest): Promise<void> {
  await fs.mkdir(forest.path, { recursive: true });
  const data: ForestFileV2 = {
    version: 2,
    name: forest.name,
    createdAt: forest.createdAt,
    lastOpenedAt: forest.lastOpenedAt,
    worktrees: forest.worktrees.map((wt) => ({
      repoRelPath: wt.repo.relPath,
      repoAbsPath: wt.repo.absPath,
      repoName: wt.repo.name,
    })),
  };
  await fs.writeFile(
    path.join(forest.path, FOREST_META_FILE),
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
}

export interface CreateForestInput {
  name: string;
  repos: RepoRef[];
  onStep?: (msg: string) => void;
}

export async function createForest(input: CreateForestInput): Promise<Forest> {
  const { name, repos, onStep } = input;
  await ensureRoot();
  const fpath = forestPath(name);
  try {
    await fs.mkdir(fpath, { recursive: false });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "EEXIST") {
      throw new Error(`Forest "${name}" already exists`);
    }
    throw err;
  }

  let completed = 0;
  const total = repos.length;

  interface AddedWorktree {
    worktree: Worktree;
    branchWasCreated: boolean;
  }

  const results = await Promise.allSettled(
    repos.map(async (repo): Promise<AddedWorktree> => {
      const wtPath = path.join(fpath, repo.name);
      await gitWorktreePrune(repo.absPath);
      const branchExisted = await gitHasBranch(repo.absPath, name);
      if (branchExisted) {
        await gitWorktreeAttach(repo.absPath, wtPath, name);
      } else {
        const defaultBranch = await gitDefaultBranch(repo.absPath);
        await gitWorktreeAdd(repo.absPath, wtPath, name, defaultBranch);
      }
      completed++;
      onStep?.(`added ${repo.name} (${completed}/${total})`);
      void gitFetch(repo.absPath);
      return {
        worktree: { repo, path: wtPath, exists: true },
        branchWasCreated: !branchExisted,
      };
    }),
  );

  const added: AddedWorktree[] = [];
  const errors: Error[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") added.push(r.value);
    else errors.push(r.reason as Error);
  }

  if (errors.length > 0) {
    onStep?.(`rolling back`);
    await Promise.allSettled(
      added.map(async ({ worktree: wt, branchWasCreated }) => {
        try {
          await gitWorktreeRemove(wt.repo.absPath, wt.path, true);
        } catch {
          /* ignore */
        }
        try {
          await fs.rm(wt.path, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        if (branchWasCreated) {
          try {
            await gitBranchDelete(wt.repo.absPath, name, true);
          } catch {
            /* ignore */
          }
        }
      }),
    );
    try {
      await fs.rm(fpath, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    throw errors[0];
  }

  const worktrees = added.map((a) => a.worktree);

  const forest: Forest = {
    name,
    path: fpath,
    createdAt: new Date().toISOString(),
    worktrees,
  };
  await saveForest(forest);
  await writeWorkspaceFile(forest);
  return forest;
}

export interface AddWorktreeInput {
  forest: Forest;
  repo: RepoRef;
  onStep?: (msg: string) => void;
}

export async function addWorktreeToForest(
  input: AddWorktreeInput,
): Promise<Forest> {
  const { forest, repo, onStep } = input;
  const branchName = forest.name;
  const wtPath = path.join(forest.path, repo.name);

  onStep?.(`adding ${repo.name}`);
  await gitWorktreePrune(repo.absPath);
  if (await gitHasBranch(repo.absPath, branchName)) {
    await gitWorktreeAttach(repo.absPath, wtPath, branchName);
  } else {
    const defaultBranch = await gitDefaultBranch(repo.absPath);
    await gitWorktreeAdd(repo.absPath, wtPath, branchName, defaultBranch);
  }
  void gitFetch(repo.absPath);

  const updated: Forest = {
    ...forest,
    worktrees: [
      ...forest.worktrees,
      {
        repo,
        path: wtPath,
        exists: true,
      },
    ],
  };
  await saveForest(updated);
  await writeWorkspaceFile(updated);
  return updated;
}

export interface RemoveWorktreeInput {
  forest: Forest;
  worktree: Worktree;
  onStep?: (msg: string) => void;
}

export async function removeWorktreeFromForest(
  input: RemoveWorktreeInput,
): Promise<Forest> {
  const { forest, worktree, onStep } = input;

  if (worktree.exists) {
    onStep?.(`removing worktree ${worktree.repo.name}`);
    try {
      await gitWorktreeRemove(worktree.repo.absPath, worktree.path, false);
    } catch (err) {
      const msg = String((err as Error).message || "");
      if (msg.includes("is dirty") || msg.includes("uncommitted")) {
        throw new Error(
          `Worktree has uncommitted changes. Aborting to protect your work.`,
        );
      }
      await gitWorktreeRemove(worktree.repo.absPath, worktree.path, true);
    }
  } else {
    onStep?.(`pruning stale worktree`);
    await gitWorktreePrune(worktree.repo.absPath);
  }

  try {
    await fs.rm(worktree.path, { recursive: true, force: true });
  } catch {
    // ignore
  }

  const updated: Forest = {
    ...forest,
    worktrees: forest.worktrees.filter(
      (wt) => wt.repo.absPath !== worktree.repo.absPath,
    ),
  };
  await saveForest(updated);
  await writeWorkspaceFile(updated);
  return updated;
}

export interface RenameForestInput {
  forest: Forest;
  newName: string;
  onStep?: (msg: string) => void;
}

export async function renameForest(
  input: RenameForestInput,
): Promise<Forest> {
  const { forest, newName, onStep } = input;
  if (newName === forest.name) return forest;

  const newForestPath = forestPath(newName);
  try {
    await fs.access(newForestPath);
    throw new Error(`Forest "${newName}" already exists.`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "ENOENT") throw err;
  }

  for (const wt of forest.worktrees) {
    if (!wt.exists) continue;
    if (await gitHasBranch(wt.repo.absPath, newName)) {
      throw new Error(
        `Branch "${newName}" already exists in ${wt.repo.name}.`,
      );
    }
  }

  onStep?.(`moving forest directory`);
  await fs.rename(forest.path, newForestPath);
  await renameWorkspaceFile(newForestPath, forest.name, newName);

  const newWorktrees: Worktree[] = [];
  for (const wt of forest.worktrees) {
    const newWtPath = path.join(newForestPath, wt.repo.name);

    onStep?.(`updating ${wt.repo.name}`);

    try {
      await gitBranchRename(wt.repo.absPath, forest.name, newName);
    } catch {
      // branch may already not exist; continue
    }
    if (wt.exists) {
      await gitWorktreeRepair(wt.repo.absPath, [newWtPath]);
    } else {
      await gitWorktreePrune(wt.repo.absPath);
    }

    newWorktrees.push({ ...wt, path: newWtPath });
  }

  const updated: Forest = {
    ...forest,
    name: newName,
    path: newForestPath,
    worktrees: newWorktrees,
  };
  await saveForest(updated);
  await writeWorkspaceFile(updated);
  return updated;
}

export interface DeleteForestInput {
  forest: Forest;
  onStep?: (msg: string) => void;
}

export async function deleteForest(input: DeleteForestInput): Promise<void> {
  const { forest, onStep } = input;
  const branchName = forest.name;

  for (const wt of forest.worktrees) {
    if (wt.exists) {
      onStep?.(`removing worktree ${wt.repo.name}`);
      try {
        await gitWorktreeRemove(wt.repo.absPath, wt.path, true);
      } catch {
        // fall back to manual cleanup below
      }
    } else {
      onStep?.(`pruning stale worktree ${wt.repo.name}`);
      await gitWorktreePrune(wt.repo.absPath);
    }

    onStep?.(`deleting branch ${branchName} in ${wt.repo.name}`);
    try {
      await gitBranchDelete(wt.repo.absPath, branchName, true);
    } catch {
      // branch may already be gone
    }
  }

  onStep?.(`removing ${forest.path}`);
  await removeWorkspaceFile(forest.path, forest.name);
  await fs.rm(forest.path, { recursive: true, force: true });

  for (const wt of forest.worktrees) {
    await gitWorktreePrune(wt.repo.absPath);
  }
}

export async function refreshWorktreeStatuses(
  forest: Forest,
): Promise<Forest> {
  const worktrees = await Promise.all(
    forest.worktrees.map(async (wt) => {
      if (!wt.exists) return wt;
      try {
        const status = await gitStatus(wt.path);
        return { ...wt, status };
      } catch {
        return wt;
      }
    }),
  );
  return { ...forest, worktrees };
}

export async function touchLastOpened(forest: Forest): Promise<Forest> {
  const updated: Forest = {
    ...forest,
    lastOpenedAt: new Date().toISOString(),
  };
  await saveForest(updated);
  return updated;
}

