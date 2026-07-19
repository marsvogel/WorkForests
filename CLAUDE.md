# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                                   # run with tsx (no build step)
npm run build                                 # esbuild → dist/cli.js (single ESM bundle)
npm run start                                 # run the built bundle
npm run typecheck                             # tsc --noEmit (always run before finishing a change)

node --import tsx/esm scripts/snapshot.mjs    # render every screen to stdout for layout review
```

There is no test runner. `scripts/snapshot.mjs` uses `ink-testing-library` and is the closest we have — it exercises all screens with synthetic data, which is useful after touching UI primitives or screen layout.

The tool requires a real TTY. `npm run dev` works in a terminal; piping it or running it inside a subprocess without a PTY will error out by design (`src/cli.tsx`).

## Core model

Three disk locations, two roles:

| Path | Role | Modifications |
|---|---|---|
| `~/Repository/` | source repos (scanned recursively, depth 8) | never mutated except via `git worktree add/remove/repair`, `git branch -m/-D`, `git fetch` |
| `~/Work Forests/<forest>/` | forest root (= branch-working-copy-group) | owned by this tool |
| `~/Work Forests/<forest>/<repo>/` | individual worktree | created by `git worktree add`; contains real working tree |

**Key invariant**: a forest's name equals the branch name used in every constituent worktree. There is no separate worktree name. Rename means: move the folder, rename the branch in every repo, `git worktree repair` each worktree, update the `.code-workspace` file. All of this lives in `core/forest.renameForest`.

**Key invariant**: the tool is robust to users deleting things in Finder. `loadForestByPath` returns `null` on a missing/invalid meta file; `listForests` silently skips such directories.

## Architecture layers

```
src/cli.tsx              alt-screen setup, process signal handlers, ink render
 └─ src/app.tsx          route state machine + in-memory forest list + toast slot
     ├─ src/screens/*    one screen per route, no routing logic of their own
     └─ src/ui/*         primitives (Header, Footer, SelectList, TextInput, …)

src/core/*               pure domain logic, no React
 ├─ forest.ts            create/add/remove/rename/delete + refresh (see below)
 ├─ git.ts               thin execFile wrapper, one function per git verb
 ├─ ide.ts               Cursor + Claude Code launchers
 ├─ workspace.ts         <forest>.code-workspace read/write/rename
 ├─ repo-scanner.ts      walks ~/Repository respecting IGNORED_DIRS
 ├─ fuzzy.ts             fuzzysort wrapper returning match indices
 └─ paths.ts             path helpers + name validation
```

Screens receive callbacks from `app.tsx` (`onOpen`, `onEdit`, `onDelete`, …). They never `setRoute` directly, never touch the filesystem themselves — they render and dispatch. This keeps the state machine auditable in one file.

## Non-obvious patterns to preserve

**Never block on the network.** `gitDefaultBranch` resolves from cached `origin/HEAD`, then local remote-tracking refs (`origin/main|master|develop`), then local branches, and only as a last resort runs `git remote set-head --auto` (with a final fallback to the current `HEAD`). `gitFetch` is called with `void` (fire-and-forget) per repo, right after that repo's worktree has been attached/added. Adding a blocking fetch back into `createForest` or `addWorktreeToForest` will regress the UX by seconds-to-minutes per repo on VPN/slow remotes.

**Per-repo operations run in parallel where independence allows.** `createForest` uses `Promise.allSettled` for both the main pass and the rollback on partial failure. `refreshWorktreeStatuses` uses `Promise.all` with per-item try/catch (so failures don't reject the outer promise). `deleteForest` currently walks repos sequentially with `for … of` so step reporting stays linear — each step (`removing`/`pruning`, then `deleting branch`) is emitted per repo. Don't reintroduce `for … of` loops elsewhere unless there is a real ordering constraint (there usually isn't — each repo is independent).

**Home doesn't call `gitStatus`.** `reloadForests` in `app.tsx` only calls `listForests()`. Git status is refreshed inside the Edit screen on mount, because only Edit shows it. If you add status to Home, do it async without blocking reloadForests.

**Toasts flow through the footer.** `showToast` in `app.tsx` sets a time-limited message that Home passes into `Footer`'s `status` slot. There is no overlay component. A toast replaces the rightmost status text for ~3s, then the default status (e.g. forest count) returns.

**Alt-screen buffer.** `cli.tsx` writes `\x1b[?1049h` on start and restores with `\x1b[?1049l` in an `exit` handler plus SIGINT/SIGTERM. If you add another exit path (e.g. a hard `process.exit()` from inside the app), make sure it goes through `restore()` first or the scrollback stays corrupted.

**IDE handoff modes differ on purpose.** Cursor opens detached via `spawn` and prefers the `.code-workspace` file (generated by `core/workspace`). Claude Code opens via `osascript` against iTerm2 — new tab in the current window, fallback to new window. The Ink app keeps running in both cases; there is no longer a process handoff.

**Workspace file is synchronized, not authored-once.** `createForest`, `addWorktreeToForest`, `removeWorktreeFromForest`, and `renameForest` all call `writeWorkspaceFile` / `renameWorkspaceFile` at the end. If you add another forest-mutation path, keep this in sync or Cursor will open a stale workspace.

## Code style

**Never write explanatory comments.** Not in TypeScript, not in config or workflow YAML. Code says what it does; the reasoning behind a change belongs in the commit message and the pull request, where it stays attached to the diff it explains instead of drifting out of date next to it. Prose that describes the system as a whole goes here in `CLAUDE.md` or into `README.md`.

## UI design language

Utility/Helix-inspired. One magenta accent, semantic green/yellow/red only for status. No panel borders, no decorative dividers — whitespace and bold carry hierarchy. Labels are English and compact (`move`, `open`, `new`, not `navigieren`). Symbols are semantic, not decorative. The theme exposes nine (`▸ ✓ ! × + > … ↑ ↓` in `ui/theme.ts`) for cursor/status/prompts; Home adds three metadata glyphs inline (`◆` worktree count, `◷` time, `⌁` repos). Don't add decorative ones.

The Footer component renders a Helix-style statusbar: inverted magenta mode prefix on the left, hints in the middle, right-aligned status/toast slot. Every screen passes a `mode` string that appears both in the header and the statusbar prefix.

Time is always relative-compact (`2h ago`, `3d ago`) via `ui/format.formatRelativeTime`. Paths are collapsed via `ui/format.compactPath` (`~/…`). Long names truncate in the middle via `truncateMiddle`.

## Forest meta format

Each forest stores a `.workforests.json` at version 2. The tool only reads v2. Bumping the version means writing a migration in `loadForestByPath`, not a silent read.

## README

The top-level `README.md` has the user-facing concept overview, installation steps, and disk layout. Keyboard shortcuts in README may lag behind the actual bindings — when in doubt, the footer hints in each screen are authoritative.
