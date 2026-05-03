---
name: conventional-commits
description: Format commit messages according to the Conventional Commits 1.0.0 specification. Use when drafting any commit, reviewing a commit message before running git commit, or auditing a commit history for compliance. Trigger on "commit this", "what should the commit message be", "is this commit message correct", or any request that produces a git commit.
---

# Conventional Commits

The [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification. Every commit in this project follows it. The format is machine-parseable, drives changelogs and version bumps, and gives a future reader the *kind* of change at a glance without reading the diff.

## Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- **type** — required. One of the canonical types below.
- **scope** — optional, in parentheses. The area of the codebase the change touches. Project-specific; the scope vocabulary is defined in the project's `CLAUDE.md`. If no scope makes sense, omit it.
- **!** — optional. Indicates a breaking change. Either the `!` here, or a `BREAKING CHANGE:` footer, or both.
- **description** — required. Short imperative summary of the change. No period. Lowercase first word unless it's a proper noun.
- **body** — optional. Explains *why*, not *what*. Wrap at ~72 chars. Blank line between description and body.
- **footer** — optional. `Token: value` pairs (e.g. `Refs: #123`, `Co-authored-by: …`, `BREAKING CHANGE: …`).

## Canonical types

| Type       | Use for                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| `feat`     | A new feature visible to a user or consumer of the API.                           |
| `fix`      | A bug fix.                                                                        |
| `docs`     | Documentation only — README, comments, plan files, generated docs.                |
| `style`    | Formatting, whitespace, missing semicolons. No code-behaviour change.             |
| `refactor` | Code change that neither fixes a bug nor adds a feature.                          |
| `perf`     | Performance improvement.                                                          |
| `test`     | Adding or correcting tests. No production code change.                            |
| `build`    | Build system, bundler config, dependency bumps that affect the build.             |
| `ci`       | CI configuration — workflow YAML, scripts run by CI.                              |
| `chore`    | Routine tasks that don't fit the above. Avoid as a catch-all; pick a better type if one fits. |
| `revert`   | Reverts a previous commit. Body should reference the reverted SHA.                |

## Breaking changes

Any commit that breaks a published API, a CLI flag, a config schema, a database shape, or a deployment contract is breaking.

Two ways to mark, both acceptable, both together is fine:

```
feat(api)!: drop support for Node 18

BREAKING CHANGE: Node 20+ required.
```

The `!` is the at-a-glance signal in `git log`. The footer is what release tooling parses for changelog "Breaking changes" sections. Use the footer when the breakage needs explaining; the `!` alone is enough when the description is self-evident.

## Examples

```
feat(engine): add Fisher-Yates deck shuffle
fix(client): handle empty pack list without crashing setup view
docs(plan-002): mark phase 1 complete
test(types): cover discriminated-union narrowing for PackCard
chore: bump pnpm lockfile after dependency audit
ci: cache pnpm store between workflow jobs
refactor(engine): extract draw logic into pure helper
perf(client): memoise card-tilt rAF callback
build: pin Node version in .nvmrc to 20.11
revert: revert "feat(engine): add weighted draw"

This reverts commit a1b2c3d. Weighted draw introduced non-determinism
the seeded RNG was supposed to prevent. Returning to uniform draw.
```

A multi-line example with body and footer:

```
fix(client): persist game state across page reload

The game store previously held state in memory only. Reloading the
page during a game lost progress silently. Move the store to
localStorage with a versioned key, and clear stale versions on load.

Refs: #142
```

## Choosing the type when it's ambiguous

- Tweaking a test that was passing? `test:`. Adding tests for new behaviour? Whatever the new behaviour's type is — the test is part of the feature/fix.
- Updating a README? `docs:`. Updating a comment to describe new behaviour? Part of the commit that introduced the behaviour.
- Bumping a dependency? `build:` if it changes the build, `chore:` if it's a security-only bump that doesn't change anything else.
- "I changed code and also added a test" — pick the type of the code change. The test is along for the ride.

If you find yourself debating `chore:` vs `refactor:` for the same change, it's probably `refactor:`. `chore:` is for things outside the source tree's behaviour entirely (e.g. updating a `.gitignore`).

## Rules

- One concern per commit. If you can't write a single-line description without "and", split the commit.
- Never use `chore:` as an escape hatch for a poorly-scoped commit. Pick a real type.
- Description is imperative ("add", not "added" or "adds"). Read it as completing the sentence "If applied, this commit will…".
- If the project's `CLAUDE.md` defines a scope vocabulary, use it. If it doesn't, scopes are optional — only include them when they add clarity.
- Don't include the issue/PR number in the description. Footer (`Refs: #123`) is the place.
