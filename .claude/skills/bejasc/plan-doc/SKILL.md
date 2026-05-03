---
name: plan-doc
description: Create a new plan document in the established format for this workspace. Use this skill whenever the user wants to write a new plan, add a planning document, or capture a structured piece of work. Trigger on phrases like "create a plan for", "new plan", "let's plan out", "add a plan document", "write up a plan". Don't wait for the user to say "skill" or ask explicitly — if they want to create a plan document, use this.
requires:
  - bejasc/doc-formatting
  - humanizer
---

# Plan Doc

This skill creates a new plan document that matches the format and conventions used across this workspace. The goal is consistency: every plan follows the same structure so anyone reading the repo can orient quickly, understand dependencies, and track progress without needing to read deeply.

Writing and formatting standards are governed by the `bejasc/doc-formatting` and `humanizer` skills. Load both before drafting.

---

## Step 1 — Interview first

Before writing anything, ask the user these questions. Ask them all in one message, not one at a time.

1. **What is this plan for?** A short title is enough — you'll refine it.
2. **What stage or category does it belong to?** Use the existing folder structure as a guide (e.g. discovery, standardise, migrate), but accept anything — this skill is not limited to those stages.
3. **What does it depend on?** Which other plans or conditions must be true before this one can begin? If nothing, say so explicitly.
4. **What does it feed into?** A reference doc, a deliverable, a downstream plan — what does completing this plan produce or unlock?
5. **What are the main phases of work?** A rough list is fine — you'll expand each one into tasks.
6. **What's the completion criteria?** How will you know this plan is done?

If the user has already answered some of these in their request, skip those questions. Don't ask for information already provided.

---

## Step 2 — Confirm before writing

Once you have answers, briefly summarise your understanding back to the user before producing the file:

> "Here's what I'm going to write: a plan called X, belonging to Y, with phases covering A, B, C. It depends on Z and feeds into W. Sound right?"

This is one sentence or two — not a long recap. Wait for confirmation.

---

## Step 3 — Write the file

### File location and naming

- Place the file inside the appropriate subfolder of `vps/plans/` — or create a new subfolder if the category doesn't exist yet.
- Use kebab-case: `03-ssl-tls.md`, `01-server-basics.md`.
- Number files sequentially within their folder. Check what already exists before picking a number.

### Frontmatter

Every plan starts with this frontmatter block, nothing else above it:

```markdown
---
status: not-started
updated: YYYY-MM-DD
---
```

Use today's date. Status is always `not-started` for a new plan. The valid values are `not-started`, `in-progress`, `complete`, and `blocked`.

### Header metadata

Immediately after the frontmatter, write the H1 title and a metadata block. The metadata uses bold inline labels, not a table or list:

```markdown
# [Stage] NN — [Title]

**Stage:** [stage name and number if applicable]
**Depends on:** [what must be complete first, or "Nothing — this is the starting point"]
**Feeds into:** [what this plan produces or unlocks]
**Next:** [the next plan in sequence, if known]
**Outcome:** [one sentence describing the end state when this plan is complete]
```

Only include fields that are meaningful. `Next` can be omitted if unknown. Don't add fields not listed here.

Follow the metadata block with a single short paragraph — two or three sentences — describing the goal and why it matters. This is not a list. It should read like a person wrote it.

---

### Phase structure

Organise work into numbered phases separated by horizontal rules. Each phase has a heading and a set of checkboxes.

```markdown
---

## Phase 1 — [Phase Name]

- [ ] Task or decision
- [ ] Task or decision
```

Phases should represent meaningful stages of work, not arbitrary groupings. A plan with one phase is fine. A plan with seven phases probably needs splitting.

**For decision-heavy plans** (e.g. standardise-type work), structure phases around decisions that must be locked before execution can begin. Use fill-in-the-blank style where appropriate:

```markdown
- [ ] Agreed approach: `________________`
- [ ] Rationale:
```

**For execution-heavy plans** (e.g. migrate-type work), phases should reflect the natural sequence of actions. Include relevant commands or config snippets inline where they'd save the user time during execution — don't make them go looking.

**For discovery plans**, use a questions-based structure: a list of open questions to answer, followed by a capture table or freeform notes area, followed by an output section.

---

### Completion section

End every plan with a `## Completion` section — a flat checklist of the things that must be true for the plan to be considered done. These should be outcomes, not tasks — the difference between "Install certbot" (task) and "All active domains have valid SSL certs" (outcome).

Always end the completion checklist with:

```markdown
- [ ] Changes committed to git
```

---

## After writing

Once the file is created, tell the user:

- Where the file was saved
- The one remaining action: commit it to git once they're happy with the content (`git add <path> && git commit -m "Add <plan name> plan"`)

Don't summarise the whole document back to them. They can read it.
