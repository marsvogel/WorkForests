# Contributing

Thanks for your interest in contributing!

## Prerequisites

- [Node.js](https://nodejs.org) 20 or newer
- macOS — the tool shells out to `git`, opens Cursor via `spawn`, and drives iTerm2 via `osascript`, so the IDE handoff is macOS-specific
- A real TTY — the interactive UI refuses to start without one (piping it or running it in a subprocess without a PTY errors out by design)

## Running

```sh
npm install
npm run dev        # run with tsx, no build step
```

## Building

```sh
npm run build      # esbuild → dist/cli.js (single ESM bundle)
npm run start      # run the built bundle
```

## Checks

There is no test runner. Two things stand in for one:

```sh
npm run typecheck                              # tsc --noEmit — always run this before finishing a change
node --import tsx/esm scripts/snapshot.mjs     # render every screen to stdout for layout review
```

`scripts/snapshot.mjs` uses `ink-testing-library` to exercise all screens with synthetic
data. It is the closest thing to a test, and it is worth running after touching UI
primitives or screen layout.

## Ground rules

- **Everything checked into this repository must be written in English**: code, comments,
  string literals, documentation, CI configuration, and commit messages.
- Commit messages follow the `type: subject` convention (e.g. `fix: …`, `feat: …`,
  `docs: …`).
- Keep the dependency footprint small — the tool intentionally leans on a handful of
  packages (`ink`, `react`, `fuzzysort`).
- Never commit absolute user paths, personal data, or anything from `~/Work Forests`.
- Respect the architecture boundaries described in [`CLAUDE.md`](CLAUDE.md): screens
  render and dispatch, `src/core/*` holds the pure domain logic, and the state machine
  lives in `src/app.tsx`.

## Pull requests

Open an issue first for larger changes so the direction can be discussed. Small fixes can
go straight to a PR. Please make sure `npm run typecheck` and `npm run build` both pass
before opening one.
