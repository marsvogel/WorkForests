# Security Policy

Workforests runs `git` on your behalf and creates, moves, and deletes directories and
branches on disk, so security reports are taken seriously.

## Reporting a vulnerability

Please report vulnerabilities privately via [GitHub Private Vulnerability Reporting](https://github.com/marsvogel/WorkForests/security/advisories/new) — do **not** open a public issue for security problems.

You can expect an initial response within a week. Once a fix is released, the
vulnerability will be disclosed in the release notes.

## Scope

Relevant areas include, but are not limited to:

- Command execution — all git calls go through the `execFile` wrapper in
  `src/core/git.ts`; arguments are passed as an argv array, never through a shell
- Path handling and name validation (`src/core/paths.ts`) — forest and branch names end
  up as filesystem paths and `git` arguments
- Destructive operations — `deleteForest` and `removeWorktreeFromForest` remove worktrees,
  prune, and delete branches; the tool is also designed to tolerate users deleting things
  in Finder without corrupting state
- The IDE handoff — Cursor is launched via `spawn`, Claude Code via `osascript`

## Supported versions

Only the latest published version on
[npm](https://www.npmjs.com/package/workforests) is supported.
