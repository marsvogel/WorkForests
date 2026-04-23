import { render } from "ink";
import React from "react";
import { App } from "./app.js";

const ENTER_ALT_SCREEN = "\x1b[?1049h\x1b[H";
const LEAVE_ALT_SCREEN = "\x1b[?1049l";

function main() {
  if (!process.stdin.isTTY) {
    process.stderr.write(
      "workforests requires a TTY. Please run it directly in a terminal.\n",
    );
    process.exit(1);
  }

  process.stdout.write(ENTER_ALT_SCREEN);

  let altScreenActive = true;
  const restore = () => {
    if (!altScreenActive) return;
    altScreenActive = false;
    try {
      process.stdout.write(LEAVE_ALT_SCREEN);
    } catch {
      /* ignore */
    }
  };

  process.on("exit", restore);
  process.on("SIGINT", () => {
    restore();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    restore();
    process.exit(143);
  });

  const { waitUntilExit } = render(<App />, {
    exitOnCtrlC: true,
  });

  waitUntilExit()
    .then(() => {
      restore();
    })
    .catch((e) => {
      restore();
      process.stderr.write(`workforests failed: ${String(e)}\n`);
      process.exit(1);
    });
}

main();
