---
name: review
description: Code review with adjustable intensity. Reviews current branch changes, specific files, or a named scope. Default intensity 3.
kind: command
invocation: /review
version: 1
---

# Review

$ARGUMENTS

You are conducting a code review. Your role is to surface trade-offs, identify coupling, and protect long-term maintainability — as a mentor, not an adversary.

> [!IMPORTANT] Best results on Opus
> This command benefits from deep architectural reasoning. For intensity 4+, switch to Opus (`/fast` or the model dropdown). Sonnet will miss subtle coupling and long-term cost.

## Parsing arguments

`$ARGUMENTS` may contain:
- An intensity level: a number (`4`) or level name (`surgical`, `casual`, etc.)
- A target: file path, directory, branch name, or a plain description of what to review
- Both, in any order

If no target is specified, review the current branch's staged and unstaged changes against the default branch. If no intensity is specified, use Level 3 (Critical).

---

## Intensity

| Level | Name | Description |
|---:|---|---|
| 1 | Casual | Affirmation-first; surface the good alongside the gaps; suitable for early drafts |
| 2 | Mentor | Balanced critique with guidance and suggested alternatives |
| 3 | Critical | Firm scrutiny; assumptions challenged; trade-offs made explicit *(default)* |
| 4 | Surgical | Uncompromising; full long-term cost analysis; nothing hand-waved |
| 5 | Brutal | Assume wrong until proven; no softening; every decision must justify itself |

Higher intensity means fewer cushions, more explicit flaws, and stronger justification demanded. Intensity governs how hard you push — not whether you're honest. Even Level 1 surfaces real problems; it just leads with what's working.

---

## Before reviewing

Do these in order before forming any opinion:

1. **Read `CLAUDE.md`.** Apply its conventions as the baseline standard. If a convention is absent or ambiguous, note the gap rather than inferring a rule.
2. **Establish what changed.** Run `git diff <default-branch>...HEAD` (or read the files named in `$ARGUMENTS`) to understand scope before evaluating anything.
3. **Check for an active plan.** If one exists, read it. Evaluate whether the change is consistent with what the plan described — scope creep in either direction is a finding.

---

## Review questions

Work through these during the review. Not every question applies to every change — use judgement about which are load-bearing for this particular diff.

- What problem does this solve, and does the implementation actually solve it?
- Does this belong where it's placed — right layer, right module, right abstraction level?
- Where are invariants enforced, and are they visible to future maintainers?
- What assumptions does this code rely on, and are they documented anywhere?
- What becomes harder as requirements grow?
- What could go wrong at runtime that isn't caught at compile time or test time?
- Is the change consistent with the active plan's intent, or has scope crept in either direction?

---

## Signals

Use these markers in findings. Apply them honestly — a 🔴 softened to 🟡 to avoid friction defeats the purpose of the review.

| Signal | Meaning |
|---|---|
| 🟢 | Strong alignment with architecture and long-term goals |
| 🟡 | Reasonable, with known trade-offs or open questions |
| 🔴 | Likely to cause friction, rework, or structural issues |
| ✅ | Acceptable / intentional risk — understood and scoped |
| ⚠️ | Caution — should be monitored or mitigated |
| ❌ | Unacceptable — redesign recommended before merging |

---

## Output

Save the review to disk at:

**Path:** `docs/reviews/<YYYY-MM-DD>-<descriptor-kebab-case>.md`

Create `docs/reviews/` if it doesn't exist. The descriptor should reflect what was reviewed (e.g. `auth-module-refactor`, `plan-003-phase-1`, `config-loader-extraction`).

**Template:**

~~~markdown
---
title: <What was reviewed>
date: <YYYY-MM-DD>
intensity: <N> — <Name>
scope: <one sentence: what was reviewed and why>
---

# Code Review — <What was reviewed> (Level <N> — <Name>)

**Date:** <YYYY-MM-DD>
**Intensity:** Level <N> — <Name>
**Scope:** <files, branch diff, or description of what was reviewed>
**Active plan:** <plan number and title, or "None">

---

## Scope

<Two or three sentences on what this change does and what the review covers. Written for someone reading this document three months later with no memory of the conversation.>

---

## Findings

<Numbered findings, each with a signal marker. At intensity 3+, every 🔴 or ❌ must include explicit rationale and long-term cost.>

### 1. <Short title> <signal>

<What was found. Name the file, function, and line. At higher intensities, include the cost of leaving this unaddressed — what breaks, when, and how badly.>

**Location:** `<file>:<line or range>`

---

### 2. <Short title> <signal>

...

---

## Standards Cross-Check

<Validate against the project's CLAUDE.md. One row per relevant standard — omit rows that don't apply to this change.>

| Standard | Status | Notes |
|---|---|---|
| Commit conventions | ✅ / ⚠️ / ❌ | |
| Branching | ✅ / ⚠️ / ❌ | |
| Documentation / comments | ✅ / ⚠️ / ❌ | |
| Test coverage | ✅ / ⚠️ / ❌ | |
| Plan alignment | ✅ / ⚠️ / ❌ | |

---

## Architecture Alignment

<Include only if the change has architectural implications. Does it fit the documented patterns? Does it introduce new coupling or new abstractions? What is the blast radius if this turns out to be wrong? If there are no architectural implications, omit this section.>

---

## Remediation Plan

<The actionable summary. A reader who only reads this section should know exactly what to fix and in what order. Each entry links back to the finding it came from. Ordered by priority within each tier — highest urgency first.>

> [!NOTE] Priority legend
> 🔴 **Critical** · 🟡 **Recommended** · 🟢 **Optional**

### 🔴 Critical — <Short title> *(Finding #N)*

<What to do. Specific enough to act on without re-reading the full finding.>

**Why now:** <The consequence of merging without addressing this.>

---

### 🟡 Recommended — <Short title> *(Finding #N)*

<What to do.>

**Why:** <The value gained or problem avoided.>

---

### 🟢 Optional — <Short title> *(Finding #N)*

<What to do.>

**Why:** <Low urgency, worth noting for later.>

---

## Verdict

<One or two sentences. Ready to merge, or not? If not, what is the specific blocker? Don't pad — a clean change that needs one small fix should say so plainly.>
~~~

---

## Rules

- Read `CLAUDE.md` before forming any opinion about conventions. Don't infer a standard that isn't written down.
- Establish what changed before reviewing. Never review from assumptions about what the diff might contain.
- Every 🔴 or ❌ finding must state explicit rationale. "This is bad practice" is not rationale.
- Every entry in Remediation must reference its finding number. Don't introduce new issues there.
- Do not modify any files in the codebase as part of the review. If something needs fixing, report it in the review document — don't fix it unless the user asks in a follow-up.
- Omit sections that don't apply (Architecture Alignment, test coverage) rather than writing placeholder content.
