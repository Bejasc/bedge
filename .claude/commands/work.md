---
name: work
description: Execute a plan phase-by-phase. Reads the plan, runs each task, checks off deliverables, commits per phase, and archives on completion.
kind: command
invocation: /work
version: 1
---

# Work

$ARGUMENTS

You are executing a plan from `docs/plans/`. The system is documented in [`standards/claude/README.md`](../README.md).

## Step 1 — Find the plan

If `$ARGUMENTS` is a path, read that file. If it's a plan number (e.g. `003`), find the matching file under `docs/plans/` (excluding `completed/`).

If neither was given, list every plan whose `status` is `active` or `draft` and ask which one.

## Step 2 — Verify it's workable

Read the frontmatter:

- `status: complete` — confirm with the user before doing anything. They may have meant a different plan, or they're extending a finished one.
- `status: blocked` — ask why it was blocked and whether the blocker has cleared.
- `status: draft` — check that *Open Questions* is empty or resolved. If not, stop and tell the user to resolve them via `/plan update <NNN>`.

Read the `depends:` list. For every plan number, confirm it is `complete`. If any aren't, stop and report which prerequisites remain.

## Step 3 — Open the plan for work

- Update frontmatter: `status: active`, `updated: <today>`.
- Update `TODO.md`: move this plan to *Active Plan*, remove from *Upcoming Plans*.
- If you're not already on a plan branch, create or switch to `plan/<NNN>-<descriptor>` from the default branch (`main` or `master` — check which the repo uses).
- Build a TodoWrite list from every unchecked deliverable across all phases. Acceptance criteria become the final group.

Commit this opening change: `docs(plan-NNN): begin <title>`.

## Step 4 — Execute phase-by-phase

For each phase, in order:

1. Find the first unchecked deliverable.
2. Before acting, state in one sentence what you're about to do. Wait for the user's go-ahead unless they've already said to proceed without checking in.
3. Execute:
   - **Shell commands** — run them.
   - **Decisions** — ask the user, then record their answer in the *Decisions Log* table (and the fill-in-the-blank field if there is one).
   - **Code or config changes** — make them. Follow the plan's sketches.
   - **References to another file** — read it before acting.
4. Run the project's verification commands as appropriate to what changed. Common patterns: typecheck after type changes, tests after logic changes, lint after new files. The plan or the project's `CLAUDE.md` should specify which.
5. Mark the deliverable `[x]` in the plan file immediately. Don't batch.
6. Update the corresponding TodoWrite item to completed.

When every deliverable in a phase is checked, say so plainly. Then commit, scoped to what the phase delivered:

- `feat(scope): …` — new functionality
- `fix(scope): …` — bug fix
- `test(scope): …` — test-only phase
- `chore(scope): …` — scaffolding, tooling, config

One commit per phase, not per deliverable. The phase commit captures the cohesive change.

Move to the next phase.

## Step 5 — Acceptance criteria

Once every phase is complete, work through the *Acceptance Criteria* checklist. Each item is an outcome to verify, not a task to perform. If a criterion fails, fix it before continuing — don't move on with a known failure.

Check items off as they pass.

## Step 6 — Complete

When every acceptance criterion is checked:

1. Update frontmatter: `status: complete`, `updated: <today>`.
2. Move the file from `docs/plans/<domain>/` to `docs/plans/completed/<domain>/`. Create the completed-domain folder if it doesn't exist.
3. Update `TODO.md`:
   - Remove from *Active Plan* (leave it empty if no other plan is starting next).
   - Add to *Completed Plans*: `[Plan NNN — Title](docs/plans/completed/<domain>/<filename>.md) — <one-line summary of what it delivered>`.
4. Commit: `docs(plan-NNN): mark plan complete`.

Tell the user the plan is done. Suggest pushing the branch and opening a PR if that's the workflow.

## Blockers

If something can't be completed — missing credentials, an external dependency, information you don't have — stop and say so. Don't silently skip. Don't paper over with placeholder code.

If the blocker prevents further progress on the plan:

1. Set frontmatter: `status: blocked`, `updated: <today>`.
2. Add a *Blocker* note near the top of the plan body explaining what's stuck and what would unblock it.
3. Update `TODO.md`: append "(blocked: <short reason>)" to the *Active Plan* entry.
4. Commit: `docs(plan-NNN): block on <reason>`.

## Rules

- Don't add features, refactor, or "improve" beyond what the plan specifies. If the plan is wrong, stop and re-plan.
- Don't generate placeholder content the user is expected to fill in. If you need their input, ask.
- Mark deliverables `[x]` immediately on completion. No batched updates at end of phase.
- Verification commands run during the phase, not all at the end.
- If you discover the plan itself is wrong mid-execution, stop and tell the user. Don't silently course-correct.
