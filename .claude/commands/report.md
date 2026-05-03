---
name: report
description: Generate a structured report from the current conversation — capturing key discussions, decision points, and recommendations with prioritised action items. Written to disk for future reference.
kind: command
invocation: /report
version: 1
---

# Report

$ARGUMENTS

You are generating or listing reports. A report captures the key discussions, decision points, and recommendations from the current conversation and writes them to disk as a structured, human-readable document.

## Modes

- `/report new [title]` — generate a report from the current conversation context
- `/report promote [report]` — promote one or more recommendations into `TODO.md`'s Captured Ideas
- `/report list` — summarise every report by date

If `$ARGUMENTS` doesn't match a mode, ask the user which they want.

---

## Mode: new

### Step 1 — Establish what to report on

If `$ARGUMENTS` includes a title or subject after `new`, use it as the report title.

If no title was given, ask:

> "What should I focus this report on? I can cover everything we've discussed, or a specific thread — just say which."

For a focused report, identify the relevant portion of the conversation. For a broad one, synthesise across the full session.

### Step 2 — Extract from conversation

Read back through the current conversation and identify:

- The core question or problem being addressed
- Any code, architecture, config, or system being discussed
- Proposals and alternatives that were weighed
- Conclusions reached and recommendations made
- Anything flagged as uncertain, deferred, or still open

Don't summarise the dialogue. Synthesise what matters: the substance, the reasoning, and the outcome. Name specific files, functions, services, and numbers where they came up — vague summaries don't age well.

### Step 3 — Confirm

In one or two sentences, tell the user what you're going to write before writing it:

> "Here's what I'll capture: [topic], covering [key threads], with [N] recommendations. Sound right?"

Wait for confirmation.

### Step 4 — Determine the filename

Slugify the title to kebab-case. Use today's date.

**Path:** `docs/reports/<YYYY-MM-DD>-<descriptor-kebab-case>.md`

Create `docs/reports/` if it doesn't exist.

### Step 5 — Write the file

Use the template below exactly. Adapt the number of recommendation entries to what the conversation actually produced — don't pad with empty placeholders, don't omit real ones.

**Priority system:**

| Symbol | Label | When to use |
|---|---|---|
| 🔴 Critical | Must act on | Significant risk, data loss, breakage, or a known blocker if ignored |
| 🟡 Recommended | Should act on | Clear value or known problem avoided; not immediately blocking |
| 🟢 Optional | Worth considering | Low urgency; safe to defer without consequence |

**Template:**

~~~markdown
---
title: <Title>
date: <YYYY-MM-DD>
context: <one sentence — what conversation or task generated this>
---

# <Title>

**Date:** <YYYY-MM-DD>
**Context:** <What triggered this report — a conversation thread, a review session, a task>

<Two or three sentences: what this report covers and why it was generated. Written for someone who wasn't in the conversation.>

---

## Background

<The context a reader needs who wasn't in the session. What was being worked on, what problem was being solved, what question was being asked. Specific enough that a future reader understands the situation without needing to find the original conversation.>

---

## Discussion

<Synthesis of the key threads — not a transcript. What was proposed, what was weighed, what was discovered. One paragraph or a short list per major thread. Use specific language: name files, functions, services, numbers. Vague summaries are not useful.>

---

## Recommendations

> [!NOTE] Priority legend
> 🔴 **Critical** · 🟡 **Recommended** · 🟢 **Optional**

### 🔴 Critical — <Short title>

<What to do. Specific enough that a reader who missed the conversation knows exactly what action to take.>

**Rationale:** <Why this is critical — the consequence of not acting.>
**Effort:** <Rough size: hours / half-day / day / days>

---

### 🟡 Recommended — <Short title>

<What to do.>

**Rationale:** <The value gained or problem avoided.>
**Effort:** <Rough size>

---

### 🟢 Optional — <Short title>

<What to do.>

**Rationale:** <Value, but low urgency.>
**Effort:** <Rough size>

---

## Decision Points

| Decision | Options Considered | Recommendation | Status |
|---|---|---|---|
| <Decision> | <Options weighed> | <What was recommended> | Open / Resolved |

---

## Open Questions

- [ ] **<Question>:** `________________`

<If none, write "None — all resolved at time of writing.">

---

## Next Steps

1. <First action — specific, with owner or target if known>
2. <Second action>

---

## Notes

<Empty at generation. Populated as work proceeds.>
~~~

### Step 6 — Tell the user

Report the path of the file that was written. Don't summarise the content back — they can read it.

---

## Mode: promote

Promotes one or more recommendations from a report into `TODO.md`'s *Captured Ideas* section, with a link back to the source report so the context is never lost when it eventually becomes a plan.

### Step 1 — Find the report

If `$ARGUMENTS` includes a path or partial name after `promote`, locate the matching file in `docs/reports/`. If multiple files match, list them and ask which one.

If no report was specified, list every file in `docs/reports/` (newest first) and ask which one to promote from.

### Step 2 — List the recommendations

Read the report and extract every recommendation — the H3 headers under `## Recommendations`. Display them numbered, with their priority marker:

```
1. 🔴 Critical — Rename `authHandler` to `handleAuthRequest`
2. 🟡 Recommended — Extract config loader into shared utility
3. 🟢 Optional — Add JSDoc to public API surface
```

Ask: "Which would you like to promote to Captured Ideas? Give me numbers, say 'all', or filter by priority (e.g. 'the critical ones')."

### Step 3 — Confirm

Restate the selected items before writing anything:

> "I'll add [N] item(s) to Captured Ideas in `TODO.md`, each linking back to this report. Go ahead?"

Wait for confirmation.

### Step 4 — Update TODO.md

Read `TODO.md`. If it doesn't exist, stop and tell the user — don't create it.

Find the *Captured Ideas* section. If the section doesn't exist, insert it between *Upcoming Plans* and *Completed Plans* (or at the end if neither is present):

```markdown
## Captured Ideas

<Nothing captured yet.>
```

For each selected recommendation, append one entry in this format:

```
- 🔴 **<Recommendation title>** — [<Report title>](docs/reports/<filename>.md) · <report date>
```

Derive the title by stripping the priority prefix from the H3 (e.g. `### 🔴 Critical — ` → just the title text). Pull the report title and date from the report's frontmatter. Replace any `<Nothing captured yet.>` placeholder with the new entries.

### Step 5 — Tell the user

Confirm what was added and where:

> "Added 2 items to Captured Ideas in `TODO.md`. Run `/plan new` when you're ready to turn one into a plan."

---

## Mode: list

Read every file in `docs/reports/`. Output in reverse-chronological order (newest first).

```
## Reports

- 2026-05-03 — Auth Module Refactor
- 2026-04-28 — Database Query Optimisation
```

If `docs/reports/` doesn't exist or is empty, say so plainly.

---

## Rules

- Write from the conversation. Don't invent content that wasn't discussed.
- Every recommendation needs a priority marker. No unmarked items.
- Be specific. "Rename `authHandler` to `handleAuthRequest` in `src/api/auth.ts`" beats "improve naming conventions."
- Don't pad. If the conversation produced one recommendation, write one. If it produced six, write six.
- Effort estimates are rough — hours / half-day / day / days is enough granularity. Don't omit them.
- Decision points belong in the table only if they were genuinely considered alternatives. Don't add rows for things that were never in question.
- The Notes section stays empty at generation.
- `new` and `list` never touch `TODO.md`. Only `promote` does, and only the *Captured Ideas* section.
