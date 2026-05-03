# Claude Workspace Standard

**Status:** Active
**Applies to:** Projects using Claude Code with a plan-driven workflow
**Last updated:** 2026-04-26

---

## What this is

A portable standard for organising work in a Claude Code project around written plans. Three slash commands cover the lifecycle:

- [`/plan`](./commands/plan.md) — author, update, or list plans
- [`/work`](./commands/work.md) — execute a plan phase-by-phase
- [`/status`](./commands/status.md) — orient at the start of a session

The command files are designed to be dropped into a project's `.claude/commands/` directory verbatim. This document describes the system they enforce.

---

## Lifecycle

A plan moves through a small set of states:

1. **Capture.** An idea lands in `TODO.md` under *Captured Ideas*. No structure required.
2. **Draft.** `/plan new` interviews you, picks a number, picks a date, and writes the plan file. *Open Questions* must be resolved before the plan can move on.
3. **Active.** `/work` opens the plan, sets `status: active`, and executes phase-by-phase.
4. **Complete.** Every phase is checked, every acceptance criterion passes. The file moves to `docs/plans/completed/<domain>/`. `TODO.md` updates accordingly.

`blocked` is a fifth state for plans that hit an unresolvable dependency mid-execution. A blocked plan stays in its domain folder with a *Blocker* note explaining what's stuck.

---

## File layout

```
docs/plans/
├── <domain>/                                  # active, blocked, draft
│   └── YYYY-MM-DD-NNN-descriptor.md
└── completed/
    └── <domain>/                              # archived plans, domain preserved
        └── YYYY-MM-DD-NNN-descriptor.md
```

Domains group related work. Common examples: `discovery`, `standardize`, `migrate`, `feature`, `infra`, `bug`, `refactor`. Pick the closest match. Create a new domain folder when nothing fits.

The `completed/` tree mirrors the active tree's domain folders. A finished `discovery` plan archives to `docs/plans/completed/discovery/`, not a flat `completed/`. This keeps the archive browseable in the same shape as the working set.

---

## Plan numbering

Plans get a sequential, zero-padded number that is **global across the whole project**: `001`, `002`, `003`. Never reuse, never skip.

The number is the plan's stable handle. It appears in branch names, commit messages, frontmatter, and `TODO.md` references. The number does not change when a plan is archived.

Three facets identify a plan, each with a different job:

- **Number** — stable handle, sort order across the project's history.
- **Date** — creation date, frozen in the filename.
- **Domain** — the *kind* of work, captured by the folder.

Together they let you sort, group, and reference plans without ambiguity.

---

## TODO.md

`TODO.md` lives at the repo root and is the single index of project state. Four sections, in order:

- **Active Plan** — the plan currently in execution. One pointer; optionally one paragraph of narrative context.
- **Upcoming Plans** — ordered list of plans that exist but haven't started. Group by phase or theme if helpful.
- **Captured Ideas** — informal thoughts that aren't yet plans. `/plan new` graduates them into plan files.
- **Completed Plans** — chronological log of finished plans, each linking to its archive location.

`/plan`, `/work`, and `/status` all read from and write to `TODO.md`. It is the durable map of where things are.

> [!IMPORTANT] Frontmatter is authoritative, not `TODO.md`
> The plan file's frontmatter is the source of truth for status. `TODO.md` is a hand-maintained index that occasionally drifts. `/status` cross-checks the two and surfaces mismatches rather than picking a winner.

---

## Plan file shape

Every plan starts with frontmatter:

```yaml
---
plan: 001
title: Server Discovery
status: draft           # draft | active | blocked | complete
date: 2026-04-26        # creation date, never changes
updated: 2026-04-26     # last status change
domain: discovery
depends: []             # list of plan numbers, or [] if none
---
```

The body has a fixed skeleton:

- A short paragraph on the goal.
- **Context** — why this plan exists.
- **Decisions Log** — table of decisions made and why.
- **Open Questions** — fill-in-the-blank entries that gate Draft → Active.
- **Phase 1, 2, …** — checkboxed deliverables, optional code sketches, phase exit criteria.
- **Out of Scope** — what this plan deliberately doesn't do.
- **Acceptance Criteria** — flat checklist of outcomes that must be true for the plan to be Complete. Always ends with `- [ ] Changes committed to git`.
- **Notes** — empty when authored, populated during execution with anything that surfaces.

The full template lives in [`commands/plan.md`](./commands/plan.md).

---

## Branching and commits

One branch per plan: `plan/<NNN>-<descriptor>`, e.g. `plan/001-server-discovery`. Branch off the default branch when work begins; the branch is the unit of review.

Commits follow Conventional Commits, scoped where possible:

- `feat(scope): …` — new functionality
- `fix(scope): …` — bug fix
- `test(scope): …` — tests
- `chore(scope): …` — tooling, config, scaffolding
- `docs(plan-NNN): …` — plan status changes, plan file edits

`/work` commits after each phase completes and verification passes. One commit per phase, not one per file. The phase commit captures the cohesive change.

---

## When to deviate

This standard is opinionated. Deviate when the project genuinely doesn't fit:

- **Throwaway experiment, single short task** — don't write a plan; just do the work.
- **Pre-existing repo with a different layout** — adopt incrementally; new plans land under `docs/plans/`, existing trees stay where they are until there's a reason to migrate.
- **Plans that turn out wrong mid-execution** — re-plan rather than force the original through. Mark the original `complete` (or `blocked`) with a *Notes* entry explaining what changed, then write a successor plan.

Don't deviate on the *shape* — frontmatter, sections, numbering, completion flow — without a reason. The consistency is what makes the system useful across sessions and across projects. A reader who knows the standard can orient in any project that follows it within thirty seconds.
