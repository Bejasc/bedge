---
name: status
description: Summarise the current state of the project so a new session can pick up where the last one left off.
kind: command
invocation: /status
version: 1
---

# Status

You are producing a session-context summary. Brief, factual, no fluff.

## Step 1 — Find the active plan

The authoritative signal is plan frontmatter, not `TODO.md`. Scan `docs/plans/` (excluding `completed/`) for files where `status: active` or `status: blocked`.

- One match — that's the active plan.
- Multiple `active` matches — list them and flag it. A workspace shouldn't normally run multiple plans concurrently.
- No match — read `TODO.md`'s *Active Plan* section as a fallback. If that's also empty, there is no active plan.

Cross-check against `TODO.md`. If frontmatter and `TODO.md` disagree, surface the mismatch — don't pick a winner silently. `TODO.md` may be out of date.

## Step 2 — Read the active plan

If there is one, parse:

- The current phase. The first phase with any unchecked deliverable, or the first phase with mixed checked/unchecked.
- The first unchecked deliverable in that phase — the next concrete step.
- Any *Open Questions* still unresolved.
- Any *Blocker* note if the plan is `blocked`.

## Step 3 — Capture git state

Run, in parallel:

- `git branch --show-current`
- `git status --short`
- `git log --oneline -10`
- Default branch detection (`git symbolic-ref refs/remotes/origin/HEAD` or check for `main` vs `master`), then `git rev-list --left-right --count HEAD...<default>` for ahead/behind.

## Step 4 — Collect upcoming work

From `TODO.md`'s *Upcoming Plans*, take the first three entries. Number, title, one-line summary each.

## Step 5 — Output

Use this format. Drop sections that are empty.

```
## Project Status

**Active plan:** Plan NNN — <title> (`<status>`, phase X of Y)
**Branch:** <branch> (<N ahead / M behind <default>>)
**Next step:** <first unchecked deliverable, or "phase exit criteria" if all deliverables in the phase are checked>
**Uncommitted changes:** <none | <one-line summary>>

### Open questions
- <question>

### Recent commits
- <hash> <subject>
- <hash> <subject>

### Up next
- Plan NNN — <title>
- Plan NNN — <title>
```

## Rules

- Read-only. Do not modify any files.
- Keep it tight — this is a status check, not a deep dive.
- If the plan is `blocked`, lead with that and surface the blocker note.
- If frontmatter and `TODO.md` disagree, surface the mismatch — don't paper over it.
- If there's no active plan, say so plainly and list what's upcoming.
- If the repo has no git history yet, skip the git sections.
