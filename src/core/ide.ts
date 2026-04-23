import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { Ide } from "../types.js";
import { workspaceFileName } from "./workspace.js";

const pexec = promisify(execFile);

export const IDE_LABEL: Record<Ide, string> = {
  cursor: "Cursor",
  claude: "Claude Code",
};

const IDE_BINARY: Record<Ide, string> = {
  cursor: "cursor",
  claude: "claude",
};

export async function isIdeAvailable(ide: Ide): Promise<boolean> {
  try {
    await pexec("which", [IDE_BINARY[ide]]);
    return true;
  } catch {
    return false;
  }
}

async function resolveCursorTarget(forestPath: string): Promise<string> {
  const forestName = path.basename(forestPath);
  const workspacePath = path.join(forestPath, workspaceFileName(forestName));
  try {
    await fs.access(workspacePath);
    return workspacePath;
  } catch {
    return forestPath;
  }
}

export async function openCursor(forestPath: string): Promise<void> {
  const target = await resolveCursorTarget(forestPath);
  const child = spawn(IDE_BINARY.cursor, [target], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function openClaudeInIterm2(forestPath: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("iTerm2 is only available on macOS");
  }

  const escaped = escapeAppleScript(forestPath);
  const script = `tell application "iTerm2"
  activate
  set forestPath to "${escaped}"
  if (count of windows) is 0 then
    create window with default profile
  else
    try
      tell current window to create tab with default profile
    on error
      create window with default profile
    end try
  end if
  tell current window
    tell current session
      write text ("cd " & quoted form of forestPath & " && claude " & quoted form of forestPath)
    end tell
  end tell
end tell`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("osascript", ["-e", script], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const msg = stderr.trim() || `osascript exited with code ${code}`;
      reject(new Error(msg));
    });
  });
}
