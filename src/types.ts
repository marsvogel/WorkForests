export interface RepoRef {
  name: string;
  relPath: string;
  absPath: string;
}

export interface WorktreeStatus {
  clean: boolean;
  changedFiles: number;
  ahead: number;
  behind: number;
}

export interface Worktree {
  repo: RepoRef;
  path: string;
  exists: boolean;
  status?: WorktreeStatus | undefined;
}

export interface Forest {
  name: string;
  path: string;
  createdAt: string;
  lastOpenedAt?: string | undefined;
  worktrees: Worktree[];
}

export interface ForestFileV2 {
  version: 2;
  name: string;
  createdAt: string;
  lastOpenedAt?: string;
  worktrees: Array<{
    repoRelPath: string;
    repoAbsPath: string;
    repoName: string;
  }>;
}

export type Ide = "cursor" | "claude";
