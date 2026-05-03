---
plan: 002
title: Testing Standard & PR Workflow
status: active
date: 2026-05-03
updated: 2026-05-03
domain: standardize
depends: []
---

# Plan 002 — Testing Standard & PR Workflow

**Domain:** standardize
**Depends on:** Nothing — infrastructure plan, no feature dependencies
**Feeds into:** All future feature plans that include unit tests; Plan 001 testing items in Captured
**Outcome:** Vitest is wired in both apps, `pnpm test` works from the root, the testing convention is documented, and a `/draft-pr` command exists that applies the correct label from the standard label set when opening a PR.

The project has no test runner, no scripts, no documented testing standard, and a dead `/draft-pr` reference in CLAUDE.md. This plan fixes the infrastructure gaps and codifies the conventions once so future plans don't relitigate them.

---

## Context

Captured ideas in `TODO.md` include unit tests for timezone logic and stoplight calculations — pure functions that would benefit from tests immediately. None of that can land until there's a test runner configured. Plan 001 will produce `lib/timezone.ts` and `lib/time-channel.ts`, both pure utility modules that are straightforward to test. This plan unblocks that work and establishes the convention so Plan 001's test cases can land in the right place with the right runner already wired.

The bot uses ESM (`"type": "module"`, NodeNext resolution). Vitest has native ESM support and requires no Babel transpilation layer, making it the natural fit. Jest would need additional configuration to work with NodeNext and ESM. The NestJS API is early stage — Vitest works well there and avoids introducing two test runners into the monorepo.

---

## Decisions Log

| Decision | Rationale |
|---|---|
| Vitest over Jest | Native ESM support; works with `"type": "module"` and NodeNext without Babel; fast cold start; same assertion API as Jest |
| `apps/<app>/tests/` alongside `src/` | Keeps test code outside the TypeScript compilation output; no `exclude` dance in tsconfig |
| One test file per domain or feature | Prevents sprawl; keeps related cases together without forcing fragmentation |
| `@vitest/coverage-v8` | Zero-config V8 coverage; no Istanbul instrumentation overhead |
| Unit tests only in this plan | Integration tests require real MongoDB and Discord sandboxes — that's a separate concern |
| No coverage thresholds yet | Set thresholds when there's enough coverage to make them meaningful |
| `draft-pr` as a `.claude/commands/` file | Keeps the PR workflow co-located with the other slash commands; no external skill dependency |
| Label derived from dominant commit type | Multiple types may appear in a branch; the highest-priority type wins (see Phase 5 for precedence order) |
| `breaking-change` label stacked on top of type label | Breaking changes are orthogonal to type — a `feat!` gets both `type:feat` and `breaking-change` |

---

## Open Questions

None — scope is well-defined from Captured items and existing project shape.

---

## Phase 1 — Document the standard

Update `CLAUDE.md` with the full testing convention so any contributor (or Claude) knows exactly where tests live, how to name them, and how to run them.

- [x] Replace the `## Testing` stub in `CLAUDE.md` with the full standard: test location (`apps/<app>/tests/`), one file per domain, naming (`<domain>.test.ts`), what belongs in unit tests vs what requires integration infrastructure
- [x] Add test commands to the `## Commands` section: `pnpm test`, `pnpm test:coverage`, per-package equivalents

**Exit criteria:** A reader of `CLAUDE.md` can answer "where do I put a test?", "what do I name it?", and "how do I run it?" without asking.

---

## Phase 2 — Wire Vitest: `apps/bot`

- [ ] Add `vitest` and `@vitest/coverage-v8` to `apps/bot` devDependencies
- [ ] Create `apps/bot/vitest.config.ts` (node environment, glob `tests/**/*.test.ts`, globals true)
- [ ] Update `apps/bot/tsconfig.json` to include `tests/**/*` so TypeScript sees test files
- [ ] Add `"test"`, `"test:watch"`, and `"test:coverage"` scripts to `apps/bot/package.json`

**Exit criteria:** `pnpm --filter bot test` resolves and exits 0.

---

## Phase 3 — Wire Vitest: `apps/api`

- [ ] Add `vitest` and `@vitest/coverage-v8` to `apps/api` devDependencies
- [ ] Create `apps/api/vitest.config.ts`
- [ ] Update `apps/api/tsconfig.json` to include `tests/**/*`
- [ ] Add `"test"`, `"test:watch"`, and `"test:coverage"` scripts to `apps/api/package.json`

**Exit criteria:** `pnpm --filter api test` resolves and exits 0.

---

## Phase 4 — Root scripts and smoke tests

Wire the root so a single command fans out across all workspaces, and prove the runner resolves with one trivial test per app. These tests assert nothing about application logic — they exist only to confirm Vitest starts, finds files, and exits 0.

- [ ] Add `"test"` and `"test:coverage"` scripts to root `package.json` using `pnpm -r test` / `pnpm -r test:coverage`
- [ ] Create `apps/bot/tests/runner.test.ts` with a single trivial assertion (e.g. `expect(true).toBe(true)`)
- [ ] Create `apps/api/tests/runner.test.ts` with the same

**Exit criteria:** `pnpm test` from the repo root runs all workspace tests and exits 0.

---

## Phase 5 — `/draft-pr` command

Create `.claude/commands/draft-pr.md` and fix the dead reference to it in `CLAUDE.md`.

The command reads the branch's commits since `main`, picks the dominant Conventional Commits type, maps it to a `type:*` label from the standard label set, and opens the PR with that label applied via `gh pr create`.

**Label selection logic** (highest-priority type wins when commits mix types):

`feat` > `fix` > `perf` > `refactor` > `test` > `build` > `ci` > `chore` > `docs` > `style`

If any commit carries a `!` suffix or a `BREAKING CHANGE:` footer, the `breaking-change` label is stacked on top of the type label. `status:*` and `priority:*` labels are left to the user — the command prompts but does not auto-apply them.

**Command behaviour (what the `.md` file instructs Claude to do):**

1. Determine the base branch (`main` or `master`).
2. Run `git log <base>..HEAD --oneline` to collect commits.
3. Parse each subject line for the Conventional Commits type prefix and any `!`.
4. Apply precedence order to pick one dominant `type:*` label; note if `breaking-change` also applies.
5. Synthesise a PR title from the branch commits (or the single commit subject if there's only one).
6. Draft a body: **Summary** (bullet points from commit subjects), **Test plan** (checklist derived from what changed).
7. Show the draft — title, body, and proposed labels — and ask the user to confirm or adjust before running `gh pr create`.
8. On confirmation: run `gh pr create --title "…" --body "…" --label "type:xxx"` (plus `--label "breaking-change"` if applicable).

- [ ] Create `.claude/commands/draft-pr.md` implementing the behaviour above
- [ ] Update `CLAUDE.md`: replace the `bejasc/draft-pr` skill reference with `/draft-pr` and a one-line description of what it does
- [ ] Verify the command renders correctly by running `/draft-pr` on the plan-002 branch and confirming it selects `type:chore` or `type:test` (whichever is dominant)

**Exit criteria:** `/draft-pr` produces a draft with a correctly-selected label; the `CLAUDE.md` reference is no longer a dead link.

---

## Out of Scope

- Integration tests that require a live MongoDB, Discord gateway, or HTTP layer
- Tests for features not yet built (timezone, stoplight logic — those belong in Plan 001)
- Coverage thresholds or CI enforcement of coverage
- NestJS `@nestjs/testing` module wiring (establish when the API has real service logic to test)
- `packages/types` or `packages/database` test infra (add if/when those packages need it)

---

## Acceptance Criteria

- [ ] `CLAUDE.md` documents test location, naming convention, and available `pnpm` commands
- [ ] `pnpm test` from the repo root runs all workspace tests and exits 0
- [ ] `pnpm --filter bot test` runs bot tests independently
- [ ] `pnpm --filter api test` runs api tests independently
- [ ] At least one passing test exists in `apps/bot/tests/`
- [ ] At least one passing test exists in `apps/api/tests/`
- [ ] `.claude/commands/draft-pr.md` exists and selects the correct `type:*` label from the standard set
- [ ] `CLAUDE.md` references `/draft-pr` with no dead links
- [ ] Changes committed to git

---

## Notes

