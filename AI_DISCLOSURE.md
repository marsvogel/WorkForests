# AI Disclosure

This repository is developed with substantial help from AI coding tools. This document
discloses how AI is involved, which tooling is used, and what human oversight applies.
It describes provenance only — it makes no statement about code quality or security.

## Default disclosure level

**`ai-generated`** — code in this repository is, by default, AI-generated with human
prompting and review. The vocabulary is adapted from the
[ai-disclosure convention](https://github.com/ggfevans/ai-disclosure) (aligned with the
W3C AI Content Disclosure vocabulary):

| Level | Meaning |
|---|---|
| `none` | No AI involvement. |
| `ai-assisted` | Human-authored; AI edited, refactored, or filled in boilerplate. |
| `ai-generated` | AI-generated with human prompting and review. |
| `ai-generated-unreviewed` | AI-generated without substantial human review. |

## Tools and models

- **Claude Code** (Anthropic), running Anthropic Claude models.
- This convention applies from **2026-07-12** onward; it is not claimed retroactively.

## Human review

- CI runs on every pull request and push to `main` (`.github/workflows/build.yml`):
  the TypeScript type check (`npm run typecheck`), the bundle build (`npm run build`),
  and the screen-snapshot render (`scripts/snapshot.mjs`). CI execution is guaranteed;
  a passing build is not currently enforced as a merge requirement.
- Not enforced by any repository mechanism: `@marsvogel` (sole maintainer and code
  owner, `.github/CODEOWNERS`) reviews AI-generated changes before merge as a working
  practice.

## Machine-readable disclosure

- **Commit trailer:** commits with AI involvement carry a `Co-Authored-By:` trailer
  with the address `noreply@anthropic.com`; the name part may include the model, e.g.
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` — match on the email
  address. This applies to commits made from **2026-07-12** onward; earlier history is
  not tagged retroactively.
- **File header (optional, forward-looking):** files may declare their level in a
  header comment using the repository's primary language (TypeScript); existing files
  are not tagged retroactively:

  ```ts
  // AI-Disclosure: ai-generated
  ```

## Scope and non-claims

- This disclosure applies to this repository only.
- The level describes **provenance, not quality** — not correctness, security, or
  fitness for purpose.
- A missing tag (commit trailer or file header) means `unknown`, not `none`.

---

Last updated: 2026-07-12 · Maintainer: [@marsvogel](https://github.com/marsvogel)
