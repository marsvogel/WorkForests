# Workforests

[![Build](https://github.com/marsvogel/WorkForests/actions/workflows/build.yml/badge.svg)](https://github.com/marsvogel/WorkForests/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/marsvogel/WorkForests)
[![Built with Claude Code](https://img.shields.io/badge/Built_with-Claude_Code-D97757?logo=claude&logoColor=fff)](./AI_DISCLOSURE.md)

**One ticket. Multiple repositories. One workspace.**

Workforests is an interactive terminal tool that turns scattered git worktrees into a shared working context. Instead of manually keeping branches in sync across three, four, five repositories, it bundles them into a *forest* — a folder where every participating worktree carries the same branch name, where your IDE opens everything at once, and which you create, rename, or discard with a single keystroke.

---

## Whose idea this is

Before anything else: the idea behind Workforests isn't mine. It came from [niheno](https://github.com/niheno), who dreamt it up long before a line of code was written — his vision of running a growing pile of tickets in parallel, fifteen at a time, fifteen branches side by side, an ever-expanding number of feature contexts carried forward at once. I'm the executing hand; the dream is his.

So if you ever run into him on the street, buy him a coffee — and make it a proper one. This tool only exists because he had the idea first.

---

## Why it exists

Most serious features don't live in a single repository. A ticket like `PROJ-1234` in practice means: a branch in the API repo, one in the web frontend, one in the shared core library — and the branches have to match each other, differ from each other, and at the same time *not* destroy your current work on `PROJ-1199` and `OPS-42`.

The usual answer is `git worktree`. It solves the technical half — clean working directories per branch, no stash ballet — but leaves you alone with the bookkeeping: where else does this branch live? Which worktree belongs to which feature? Are they named the same everywhere? Does my IDE workspace have the right folders?

Workforests takes over that bookkeeping. It knows the concept of a coherent working context and makes it the primary object.

---

## The concept

### A forest

A **forest** is a directory representing a feature or ticket context. Under it sit the worktrees of the repositories you need for that context.

```
~/Work Forests/
└── PROJ-1234/
    ├── api/                        worktree of the "api" repo
    ├── web/                        worktree of the "web" repo
    ├── core/                       worktree of the "core" repo
    ├── .workforests.json           metadata — which repos belong here
    └── PROJ-1234.code-workspace    Cursor multi-root workspace
```

### The central invariant

**The forest name is the branch name.** Everywhere.

If a forest is called `PROJ-1234`, then the branch in *every* participating repository is called exactly `PROJ-1234`. There is no separate worktree name, no prefixes, no mapping table. A single identifier names the context — in the file system, in git, in your IDE.

This has consequences that explain everything else:
- Renaming means: move the folder, rename the branch in *every* repo, repair the worktree pointers, update the workspace file — atomically from one input.
- Deleting means: remove the worktrees, clean up the branches in *every* repo, folder gone.
- Creating means: in every selected repo, pull a new branch off the default branch, hang it as a `git worktree add` into the forest folder.

### Source repositories stay untouched

Your original repositories under `~/Repository/` are never modified in the sense that a file is written there or a working directory is rearranged. Workforests only talks to them through their git interface:

- `git worktree add` — to create a new worktree under `~/Work Forests/`
- `git branch -m` / `-D` — to rename or remove branches
- `git worktree repair` / `prune` — to keep references consistent
- `git fetch` — in the background, non-blocking

Whatever you have sitting there stays as it is. The currently checked-out branch, the index, your local changes in that directory: Workforests doesn't care.

---

## A typical day

You start the tool in a terminal:

```
 home                                                                ~/Work Forests

 ▸ PROJ-1234
     ◆ 3 worktrees    ◷ opened 2h ago
     ⌁ api, web, core

   OPS-42-investigate-latency
     ◆ 1 worktree    ◷ opened 4d ago
     ⌁ infra

   + new forest

  home   ↑↓ move  ⏎ open  e edit  n new  d delete  r reload  q quit       2 forests
```

That's **Home** — your list of forests, sorted by most recently opened. Per entry you see how many worktrees belong to it, when you last used the context, and which repos participate. If worktrees are missing because they were deleted externally, that's flagged.

A new ticket comes in. You press `n`:

```
 new · 1/2                                                            ~/Work Forests

 name  > PROJ-1234

  new   ⏎ next  esc cancel
```

The name you type here is immediately the later branch name in all repos. The tool checks that it's valid and doesn't already exist.

After Enter it continues — into the **repo picker**:

```
 new · 2/2 · PROJ-1234                                                  ~/Repository

 > api

 ▸ ✓ github.com/org/api
   ✓ github.com/org/web
       bitbucket.org/org/core
       bitbucket.org/org/infra

  new   ↑↓ move  ⇥ toggle  ⏎ confirm  ^a all  esc back            2/4 · 2 selected
```

Workforests recursively scans your `~/Repository/` (up to depth eight, skipping `node_modules` and the like), finds all git repos, and lets you filter by fuzzy search. Tab selects, Enter confirms. If two repos have the same name in different paths, they're automatically disambiguated.

You confirm. In parallel, for each repo simultaneously, the following happens:

1. If the branch `PROJ-1234` already exists in this repo — re-attach it, don't create it anew.
2. Otherwise: determine the default branch (via `origin/HEAD`, then local refs), create a new branch `PROJ-1234` from it, wire it as a worktree to `~/Work Forests/PROJ-1234/<repo>/`.
3. In the background, trigger a `git fetch` (fire-and-forget, never blocking).

Seconds later the forest is there. You land back on Home, press Enter on the new forest, and pick the IDE:

```
 open · PROJ-1234                                            ~/Work Forests/PROJ-1234

 ▸ Cursor        [c]
   Claude Code   [a]

  open   ↑↓ move  ⏎ open  c/a direct  esc cancel
```

**Cursor** is launched detached and gets the forest's `.code-workspace` file handed to it — all worktrees appear side by side as a multi-root workspace. **Claude Code** is launched in a new iTerm2 tab, `cd`s into the forest folder, and then calls `claude`. The Ink TUI itself stays open in both cases — there is no process handoff.

You work, you commit, you push — everything with plain git, in the worktrees. Workforests doesn't interfere.

If you want to see how the individual worktrees are doing in between, press `e` on the forest in Home:

```
 edit · PROJ-1234                                            ~/Work Forests/PROJ-1234

   REPO                                STATUS
 ▸ api                                 ✓
   web                                 ! +4  ↑2↓1
   core                                × missing

   + add worktree

  edit   ↑↓ move  r rename  a add  d remove  esc back                    3 worktrees
```

The **edit** screen reads the git status of each worktree live: green check when clean, warning on uncommitted changes, counters for commits ahead of / behind the upstream. If a worktree has been deleted externally, it's flagged red — but the forest remains usable.

From here you can:

- **`a`** — add another worktree to the forest. The picker appears, repos already included are hidden.
- **`d`** — remove a worktree. If it has uncommitted changes, this is shown explicitly and requires deliberate confirmation.
- **`r`** — rename the entire forest. This is the only rename Workforests knows: there is no separate worktree name, so there is no "rename just the worktree". A rename is performed atomically across all repos — move the folder, rename the branch in each repo, repair the worktree pointers, update the workspace file.

When the ticket is done, you press `d` on Home. Workforests shows exactly what will happen — which worktrees disappear, which branch gets deleted in which repos, and whether uncommitted changes are in the way. After confirmation the forest is cleanly gone, everywhere.

---

## Properties the tool deliberately has

### Never block on the network

A `git fetch` over VPN against a large repo can take minutes. Workforests **never** performs a synchronous fetch before an interactive action. Default branches are determined from cached refs; fetches run in the background and don't affect the next action.

The price: if your `origin/HEAD` is completely stale, the base when branching may be suboptimal once. The gain: the tool feels equally fast everywhere — at home, in the office, on the train.

### Everything per-repo runs in parallel

Creating, deleting, status queries — when ten repos are in play, ten git processes run at the same time. On errors in individual repos, a clean rollback happens (on create): created worktrees are removed again, newly created branches are deleted, the forest folder disappears.

### Robust against outside cleanup

If you drag a forest folder to the trash in Finder or delete a single worktree folder, exactly what you expect happens: the forest disappears from the list (or shows the lost worktree as *missing*), and you can clean it up from the edit screen. The metadata file is deliberately thin — if it's missing or broken, the directory is simply no longer recognized as a forest.

### The Cursor workspace file is never out of date

`PROJ-1234.code-workspace` is rewritten on every forest mutation — on create, on add or remove of a worktree, on rename. When you open a workspace of a Workforests forest in Cursor, it always contains exactly the current worktrees, at their current paths.

### You get the terminal back untouched

Workforests runs in the alternate screen buffer — the same principle as `htop`, `less`, or `vim`. While the tool is running, you see only its UI. When you leave it (even via Ctrl-C or `kill`), your scrollback is as it was before. It leaves nothing in the visible terminal.

---

## Disk layout at a glance

```
~/Repository/                        your source repos
  github.com/org/api/
  github.com/org/web/
  bitbucket.org/org/core/
  …

~/Work Forests/                      Workforests' workspace
  PROJ-1234/                         forest — name is the branch name in all repos
    api/                             worktree, checked out as branch PROJ-1234
    web/                             worktree, checked out as branch PROJ-1234
    core/                            worktree, checked out as branch PROJ-1234
    .workforests.json                v2 metadata
    PROJ-1234.code-workspace         Cursor workspace for these three folders

  OPS-42/
    infra/
    .workforests.json
    OPS-42.code-workspace
```

The file system is the truth. There is no database, no hidden directory elsewhere, no daemon. If you throw away `~/Work Forests/`, Workforests is reset. Your source repos are completely unaffected — they know nothing of Workforests, except that a few entries under `~/Work Forests/` show up in their worktree list (`git worktree list`).

---

## Installation

Requirements:

- **macOS** (Claude Code integration goes through AppleScript / iTerm2 — on Linux the Cursor path works; the iTerm2 path is mac-only)
- **Node.js** ≥ 20
- **git** in `PATH`
- Optional: **`cursor`** and/or **`claude`** in `PATH` (for opening from the IDE picker — if the binary is missing, the picker shows it as unavailable)
- Your repositories under `~/Repository/` (recursively scanned up to depth 8; `node_modules`, `dist`, `.venv`, `target`, `Pods`, `.gradle`, etc. are skipped)

```bash
npm install
npm run build
npm link          # optional: makes the `workforests` command globally available
```

Start:

```bash
workforests
```

The tool needs a real TTY. Piping it or starting it from a subprocess without a PTY fails by design — the UI is meant for a direct terminal session.

---

## Keyboard shortcuts

When in doubt, the hints in the footer of each screen are authoritative — this list is an excerpt.

### Home

| Key | Action |
|---|---|
| `↑` `↓` | Navigate between forests |
| `⏎` | Open forest (IDE picker) |
| `e` | Edit forest |
| `n` | New forest |
| `d` | Delete forest |
| `r` | Reload list |
| `q` / `esc` | Quit |

### Create — enter name

| Key | Action |
|---|---|
| Input | Type forest name (= later branch name) |
| `⏎` | Continue to repo picker |
| `esc` | Cancel |

### Repo picker

| Key | Action |
|---|---|
| Input | Live fuzzy filter |
| `↑` `↓` | Navigate |
| `PgUp` `PgDn` | Page-wise |
| `⇥ Tab` | Select / deselect entry (multi-select) |
| `^A` | Select all visible |
| `^U` | Clear filter |
| `⏎` | Confirm |
| `esc` | Back |

### Edit

| Key | Action |
|---|---|
| `↑` `↓` | Select worktree |
| `r` | Rename entire forest (folder + all branches + worktrees) |
| `a` | Add worktree |
| `d` | Remove worktree (with protection on uncommitted changes) |
| `esc` | Back to Home |

### IDE picker

| Key | Action |
|---|---|
| `↑` `↓` / `⏎` | Select and open |
| `c` | Open Cursor directly |
| `a` | Open Claude Code directly |
| `esc` | Cancel |

---

## How to tell when something unusual is going on

- **`× missing`** next to a worktree → the folder was deleted outside the tool. In the edit screen, `d` cleans it up properly, including the branch and the git worktree reference in the source repo.
- **`! +N`** next to a worktree → N uncommitted changes. A `d` on this worktree or a delete of the entire forest shows an explicit warning before destroying anything.
- **`↑N` / `↓N`** → commits ahead of / behind the upstream — display only, the tool does not sync.
- **`c not in $PATH`** in the IDE picker → the respective binary (`cursor` or `claude`) is not installed or not in the path. The picker then lets you pick the other option.
- No forest in the list even though you see a folder → either the `.workforests.json` is missing, is not v2, or is broken. The tool silently ignores such directories. Recovery is not provided — in practice you just create the forest again; the branches remain and are automatically reused.

---

## What Workforests does not do

- **No committing, no pushing, no merging.** Branches are created and removed — everything in between is your work with plain git.
- **No synchronizing.** There is no background agent, no hooks, no scheduler. The tool does something exactly when it's running and you trigger an action.
- **No remote orchestration.** It does not care about GitHub PRs, Jira tickets, or CI. The forest name is free — you can use Jira IDs, short names, or whatever.
- **No configuration.** Paths are fixed: source repos under `~/Repository/`, forests under `~/Work Forests/`. The choice is deliberate: if the tool fits for you, it fits. If not, you're better off forking than configuring.
