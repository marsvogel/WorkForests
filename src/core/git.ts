import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WorktreeStatus } from "../types.js";

const pexec = promisify(execFile);

export interface GitError extends Error {
  stderr?: string;
}

async function git(
  cwd: string,
  args: string[],
  opts: { timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await pexec("git", args, {
      cwd,
      timeout: opts.timeout ?? 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: Buffer | string };
    const ge: GitError = new Error(
      `git ${args.join(" ")} failed: ${e.message}`,
    ) as GitError;
    ge.stderr = e.stderr?.toString();
    throw ge;
  }
}

export async function gitDefaultBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await git(repoPath, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
    ]);
    const ref = stdout.trim();
    const m = /^refs\/remotes\/origin\/(.+)$/.exec(ref);
    if (m && m[1]) return m[1];
  } catch {
    /* fall through */
  }
  for (const candidate of ["main", "master", "develop"]) {
    try {
      await git(repoPath, [
        "rev-parse",
        "--verify",
        `refs/remotes/origin/${candidate}`,
      ]);
      return candidate;
    } catch {
      /* try next */
    }
  }
  for (const candidate of ["main", "master", "develop"]) {
    try {
      await git(repoPath, ["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      /* try next */
    }
  }
  try {
    await git(repoPath, ["remote", "set-head", "origin", "--auto"], {
      timeout: 15_000,
    });
    const { stdout } = await git(repoPath, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
    ]);
    const ref = stdout.trim();
    const m = /^refs\/remotes\/origin\/(.+)$/.exec(ref);
    if (m && m[1]) return m[1];
  } catch {
    /* fall through */
  }
  const { stdout } = await git(repoPath, ["symbolic-ref", "--short", "HEAD"]);
  return stdout.trim();
}

export async function gitHasBranch(
  repoPath: string,
  branchName: string,
): Promise<boolean> {
  try {
    await git(repoPath, ["rev-parse", "--verify", `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

export async function gitWorktreeAdd(
  repoPath: string,
  targetPath: string,
  branchName: string,
  baseBranch: string,
): Promise<void> {
  try {
    await git(repoPath, [
      "worktree",
      "add",
      "--no-track",
      "-b",
      branchName,
      targetPath,
      `origin/${baseBranch}`,
    ]);
    return;
  } catch (err) {
    const msg = String((err as GitError).stderr ?? (err as Error).message);
    const remoteMissing =
      msg.includes("invalid reference") ||
      msg.includes("not a valid object") ||
      msg.includes("unknown revision");
    if (!remoteMissing) throw err;
  }
  await git(repoPath, [
    "worktree",
    "add",
    "--no-track",
    "-b",
    branchName,
    targetPath,
    baseBranch,
  ]);
}

export async function gitWorktreeAttach(
  repoPath: string,
  targetPath: string,
  branchName: string,
): Promise<void> {
  await git(repoPath, ["worktree", "add", targetPath, branchName]);
}

export async function gitWorktreeRemove(
  repoPath: string,
  worktreePath: string,
  force: boolean,
): Promise<void> {
  const args = ["worktree", "remove"];
  if (force) args.push("--force");
  args.push(worktreePath);
  await git(repoPath, args);
}

export async function gitWorktreeRepair(
  repoPath: string,
  paths?: string[],
): Promise<void> {
  const args = ["worktree", "repair"];
  if (paths && paths.length > 0) args.push(...paths);
  try {
    await git(repoPath, args);
  } catch {
    // non-fatal
  }
}

export async function gitWorktreePrune(repoPath: string): Promise<void> {
  try {
    await git(repoPath, ["worktree", "prune"]);
  } catch {
    // non-fatal
  }
}

export async function gitBranchRename(
  repoPath: string,
  oldName: string,
  newName: string,
): Promise<void> {
  await git(repoPath, ["branch", "-m", oldName, newName]);
}

export async function gitBranchDelete(
  repoPath: string,
  branchName: string,
  force: boolean,
): Promise<void> {
  const flag = force ? "-D" : "-d";
  await git(repoPath, ["branch", flag, branchName]);
}

export async function gitFetch(repoPath: string): Promise<void> {
  try {
    await git(repoPath, ["fetch", "--quiet", "origin"], { timeout: 45_000 });
  } catch {
    // Network may be offline; not fatal — we'll fall back to local refs.
  }
}

export async function gitStatus(
  worktreePath: string,
): Promise<WorktreeStatus> {
  try {
    const { stdout } = await git(worktreePath, [
      "status",
      "--porcelain=v2",
      "--branch",
    ]);
    let ahead = 0;
    let behind = 0;
    let changedFiles = 0;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("# branch.ab ")) {
        const m = /# branch\.ab \+(\d+) -(\d+)/.exec(line);
        if (m && m[1] && m[2]) {
          ahead = parseInt(m[1], 10);
          behind = parseInt(m[2], 10);
        }
      } else if (line.length > 0 && !line.startsWith("#")) {
        changedFiles++;
      }
    }
    return {
      clean: changedFiles === 0,
      changedFiles,
      ahead,
      behind,
    };
  } catch {
    return {
      clean: true,
      changedFiles: 0,
      ahead: 0,
      behind: 0,
    };
  }
}

