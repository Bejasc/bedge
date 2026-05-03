---
name: plan
description: Author, update, or list project plans. Interviews the user, confirms understanding, and writes a structured plan file.
kind: command
invocation: /plan
version: 1
---

# Plan

$ARGUMENTS

You are creating, updating, or listing plans. The system is documented in [`standards/claude/README.md`](../README.md) — read it if you haven't seen this workflow before.

## Modes

- `/plan new` — author a new plan (interview-driven)
- `/plan update <NNN>` — apply changes to an existing plan
- `/plan list` — summarise every plan by status

If `$ARGUMENTS` doesn't match a mode, ask the user which they want.

---

## Mode: new

### Step 1 — Interview

Ask the following in a single message. Skip any that `$ARGUMENTS` already answers.

1. **Title.** A short name for the plan.
2. **Domain.** Which subfolder under `docs/plans/`. List the domains that already exist; if none fit, propose a new one and confirm.
3. **Depends on.** Which other plans must be complete first? Use plan numbers. If nothing, say so explicitly.
4. **Feeds into.** What does this plan produce or unlock — a reference doc, a deployable, a downstream plan.
5. **Phases.** A rough list of the main stages of work. One sentence each.
6. **Acceptance criteria.** How will you know the plan is done?
7. **Open questions.** Anything unresolved that needs to be settled before execution.

### Step 2 — Confirm

Summarise back in one or two sentences before writing anything:

> "Here's what I'm going to write: a plan called X in domain Y, depending on plans Z, with phases A, B, C, feeding into W. Sound right?"

Wait for confirmation.

### Step 3 — Pick the number

List `docs/plans/` recursively, including `completed/`, and find the highest existing plan number across all domains. Increment by one. Format as zero-padded three digits.

### Step 4 — Write the file

**Path:** `docs/plans/<domain>/<YYYY-MM-DD>-<NNN>-<descriptor-kebab-case>.md`

Use today's date. Slugify the title to kebab-case for the descriptor.

**Frontmatter:**

```yaml
---
plan: <NNN>
title: <Title>
status: draft
date: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
domain: <domain>
depends: [<list of plan numbers, or empty>]
---
```

**Body skeleton:**

```markdown
# Plan <NNN> — <Title>

**Domain:** <domain>
**Depends on:** <plan list, or "Nothing — this is a starting point">
**Feeds into:** <description>
**Outcome:** <one sentence — the end state when complete>

<Two or three sentences on the goal and why it matters. Written like a person, not a template.>

---

## Context

<Why this plan exists. What problem it solves. The background a future reader needs in order to understand the rest of the document.>

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| <decision> | <choice> | <reason> |

---

## Open Questions

<Unresolved decisions that must be answered before status moves to active. List them as fill-in-the-blank where useful:>

- [ ] **<Question>:** `________________`
- [ ] **<Question>:** `________________`

<If none, write "None — all resolved.">

---

## Phase 1 — <Phase Name>

- [ ] Deliverable
- [ ] Deliverable

<Inline code sketches, config snippets, or notes that would save time during execution.>

**Exit criteria:** <what must be true to mark this phase done>

---

## Phase 2 — <Phase Name>

…

---

## Out of Scope

- <Item the user might expect this plan to cover, but it doesn't>

---

## Acceptance Criteria

Flat list of outcomes — not tasks — that must be true for the plan to be considered complete:

- [ ] <Outcome>
- [ ] <Outcome>
- [ ] Changes committed to git

---

## Notes

<Empty when the plan is authored. Populated during execution with anything that surfaces — discoveries, scope adjustments, decisions made on the fly.>
```

Phase shapes vary by plan kind:

- **Decision-heavy plans** (e.g. setting a standard) — phases structured around decisions to lock. Use fill-in-the-blank fields.
- **Execution-heavy plans** (e.g. building a feature, migrating a service) — phases follow the natural sequence of actions. Include commands and config snippets inline.
- **Discovery plans** — phases hold open questions to answer, capture areas, and an output section.

A plan with one phase is fine. Seven phases probably needs splitting.

### Step 5 — Update TODO.md

- If a captured idea inspired this plan, remove it from *Captured Ideas*.
- Add an entry under *Upcoming Plans*: `[Plan NNN — Title](docs/plans/<domain>/<filename>.md) — <one-sentence summary>. Depends on <list>.`

### Step 6 — Tell the user

Report the path of the new file and the one remaining action: review and resolve the *Open Questions*, then run `/work <NNN>`. Don't summarise the plan back — they just answered the interview, they know what's in it.

---

## Mode: update

1. Find the plan file matching `<NNN>` under `docs/plans/` (or `docs/plans/completed/`). If multiple match, confirm which.
2. Apply the requested changes.
3. Set `updated:` in the frontmatter to today's date.
4. If `status` changes, update `TODO.md`:
   - `draft → active` — move the entry from *Upcoming* to *Active Plan*.
   - `active → complete` — see *Mode: complete* below.
   - `active → blocked` — leave in *Active Plan* with a "(blocked: <reason>)" suffix.

### Mode: complete (a sub-case of update)

Triggered when a plan moves to `complete`. `/work` runs this automatically when acceptance criteria pass; `/plan update <NNN> --complete` runs it manually.

1. Verify every checkbox under *Phases* and *Acceptance Criteria* is `[x]`. If any are unchecked, ask before proceeding.
2. Update frontmatter: `status: complete`, `updated: <today>`.
3. Move the file from `docs/plans/<domain>/` to `docs/plans/completed/<domain>/`. Create the completed-domain folder if it doesn't exist.
4. Update `TODO.md`:
   - Remove from *Active Plan* (or *Upcoming Plans* if the plan was completed without going active — unusual).
   - Add to *Completed Plans*: `[Plan NNN — Title](docs/plans/completed/<domain>/<filename>.md) — <what it delivered>`.
5. Commit: `docs(plan-NNN): mark plan complete`.

---

## Mode: list

Read every plan file in `docs/plans/` recursively, including `completed/`. Group output by `status` in this order: `active`, `blocked`, `draft`, `complete`.

For each plan, show: number, title, domain, last `updated` date.

```
## Active
- 003 — Server Migration       (migrate)        updated 2026-04-26

## Draft
- 005 — Blog Infra Rewrite     (blog)           updated 2026-04-23

## Complete
- 001 — Server Discovery       (discovery)      updated 2026-04-12
- 002 — Hosting Inventory      (discovery)      updated 2026-04-15
```

Keep it tight. No prose between rows.

---

## Rules

- Never reuse or skip a plan number.
- Open Questions must be resolved before `status` moves from `draft` to `active`.
- Decisions belong in the *Decisions Log* table, not scattered through prose.
- Don't summarise a plan back to the user after writing it. The file is the artefact.
- Don't generate full implementations in the plan body. Sketches and config snippets are fine; the implementation belongs in the work itself.
