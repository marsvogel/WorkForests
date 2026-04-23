import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
export const REPO_ROOT = path.join(HOME, "Repository");
export const WORKFOREST_ROOT = path.join(HOME, "Work Forests");
export const FOREST_META_FILE = ".workforests.json";
export const MAX_SCAN_DEPTH = 8;

export const IGNORED_DIRS = new Set<string>([
  "node_modules",
  ".cache",
  ".next",
  "dist",
  "build",
  "coverage",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".tox",
  ".gradle",
  ".idea",
  ".vscode",
  "vendor",
  "Pods",
  ".bundle",
  ".parcel-cache",
  ".turbo",
  ".pnpm-store",
]);
