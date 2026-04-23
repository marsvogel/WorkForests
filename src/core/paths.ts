import path from "node:path";
import { WORKFOREST_ROOT } from "../constants.js";

export function forestPath(forestName: string): string {
  return path.join(WORKFOREST_ROOT, forestName);
}

const INVALID_NAME_RE = /[\s/\\:*?"<>|]/;
const RESERVED = new Set(["", ".", ".."]);

export function validateName(name: string): string | null {
  if (!name) return "Name must not be empty";
  if (RESERVED.has(name)) return "Name is reserved";
  if (name.startsWith(".")) return "Name must not start with a dot";
  if (INVALID_NAME_RE.test(name)) return "Name contains invalid characters";
  if (name.length > 100) return "Name is too long (>100 characters)";
  return null;
}
