import fs from "node:fs/promises";
import path from "node:path";
import { IGNORED_DIRS, MAX_SCAN_DEPTH, REPO_ROOT } from "../constants.js";
import type { RepoRef } from "../types.js";

export async function scanRepos(root = REPO_ROOT): Promise<RepoRef[]> {
  const result: RepoRef[] = [];
  try {
    await walk(root, root, 0, result);
  } catch {
    // Root may not exist yet; return empty set.
  }
  result.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return result;
}

async function walk(
  root: string,
  dir: string,
  depth: number,
  out: RepoRef[],
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }

  if (entries.includes(".git")) {
    const gitPath = path.join(dir, ".git");
    try {
      const stat = await fs.stat(gitPath);
      if (stat.isDirectory() || stat.isFile()) {
        const relPath = path.relative(root, dir);
        if (relPath !== "") {
          out.push({
            name: path.basename(dir),
            relPath,
            absPath: dir,
          });
        }
        return; // Don't descend into a repo.
      }
    } catch {
      // ignore
    }
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.startsWith(".")) return;
      if (IGNORED_DIRS.has(entry)) return;
      const full = path.join(dir, entry);
      let stat: import("node:fs").Stats;
      try {
        stat = await fs.lstat(full);
      } catch {
        return;
      }
      if (stat.isSymbolicLink() || !stat.isDirectory()) return;
      await walk(root, full, depth + 1, out);
    }),
  );
}

export function disambiguateRepoNames(repos: RepoRef[]): RepoRef[] {
  const byName = new Map<string, RepoRef[]>();
  for (const repo of repos) {
    const existing = byName.get(repo.name);
    if (existing) existing.push(repo);
    else byName.set(repo.name, [repo]);
  }
  const result: RepoRef[] = [];
  for (const [name, group] of byName) {
    if (group.length === 1) {
      result.push(group[0]!);
    } else {
      for (const r of group) {
        const parts = r.relPath.split(path.sep);
        const parent = parts.length >= 2 ? parts[parts.length - 2] : undefined;
        const newName = parent ? `${parent}__${name}` : name;
        result.push({ ...r, name: newName });
      }
    }
  }
  return result;
}
