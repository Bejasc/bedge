---
name: doc-coauthoring
description: Guide users through a structured workflow for co-authoring markdown documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structured content. Optimised for Obsidian-compatible markdown. Trigger when user mentions writing docs, creating proposals, drafting specs, or similar documentation tasks.
requires:
  - bejasc/doc-formatting
  - humanizer
---

# Doc Co-Authoring Workflow

Four-stage workflow for collaborative document creation: Context Gathering → Refinement & Structure → Humanization → Reader Testing.

Before drafting any section, load the `bejasc/doc-formatting` skill — the formatting standards there apply throughout Stage 2 and are rechecked in Stage 3.

## When to offer this workflow

Trigger conditions:

- User mentions writing documentation: "write a doc", "draft a proposal", "create a spec", "write up"
- User mentions specific doc types: "PRD", "design doc", "decision doc", "RFC"
- User seems to be starting a substantial writing task

Offer the four stages. If user declines, work freeform but still apply the formatting standards and run a humanization pass before delivering any draft. If user accepts, proceed to Stage 1.

---

## Stage 1: Context Gathering

**Goal:** Close the gap between what the user knows and what Claude knows.

Ask for meta-context first:

1. What type of document? (spec, decision doc, proposal, process guide, feature doc)
2. Who's the primary audience?
3. What's the desired impact when someone reads this?
4. Is there a template or format to follow?
5. Any other constraints?

Tell them to answer in shorthand or dump context however works best.

**If a template is mentioned:** Ask if they can share it. Fetch or read it if provided.

**If editing an existing shared document:** Read the current state. Check for images without alt-text — if found, explain the issue and offer to generate alt-text from images pasted into chat.

### Info dump

Ask the user to dump all context: background, related discussions, why alternatives aren't being used, org context, timeline pressures, technical dependencies, stakeholder concerns. Tell them not to worry about organising it.

If integrations are available (Slack, Teams, Drive, etc.), use them to pull context. If not, suggest enabling connectors in Claude settings.

If a term, project, or person is mentioned and unknown: search the workspace first before asking the user.

### Clarifying questions

Once substantial context is in, generate 5–10 numbered questions to fill remaining gaps. Tell the user they can answer in shorthand, point to channels or docs, or keep dumping. Move on when edge cases and trade-offs can be asked about without needing basics explained.

Ask if they want to add anything, then move to Stage 2.

---

## Stage 2: Refinement & Structure

**Goal:** Build the document section by section through brainstorming and iterative refinement. Apply `bejasc/doc-formatting` standards throughout drafting — not as a post-pass, but as part of writing each section.

### Structure

If the structure is unclear, suggest 3–5 sections appropriate for the doc type. Start with the section that has the most unknowns. Summary sections go last.

Once structure is agreed, create the scaffold — all section headers with placeholder text like `[To be written]`.

- **Artifacts available:** Use `create_file`. Provide the link.
- **No artifacts:** Create a named markdown file in the working directory.

### Per-section loop

Repeat for each section:

1. **Clarify** — 5–10 questions about what this section should cover.
2. **Brainstorm** — 5–20 numbered options depending on complexity. Offer to generate more.
3. **Curate** — Ask which to keep, remove, or combine. Accept freeform feedback and parse it.
4. **Gap check** — Ask if anything important is missing.
5. **Draft** — `str_replace` the placeholder. Never reprint the whole doc. Link to artifact if applicable.
6. **Iterate** — Surgical edits per feedback. After 3 iterations with no substantial changes, ask if anything can be cut without losing meaning.

On the first section, tell the user: describe changes rather than editing directly (e.g., "remove the X bullet — it's covered by Y") — it helps learn their style for subsequent sections.

### Near completion

When 80%+ of sections are done, re-read the full document and check for flow, consistency, redundancy, contradictions, filler, and whether every sentence carries weight. Provide the findings.

When all sections are drafted, do a final review for coherence. Then ask if ready for Stage 3.

---

## Stage 3: Humanization

**Goal:** Ensure the document reads like a person wrote it before Reader Testing. A technically complete doc that reads like slop will fail.

Load and invoke the `humanizer` skill. Pass it the full document. If the humanizer skill isn't available, apply its patterns manually from memory.

Confirm humanization is complete. Ask if ready for Stage 4.

---

## Stage 4: Reader Testing

**Goal:** Test the document with a fresh Claude instance (no context from this conversation).

### With sub-agents available

1. Generate 5–10 questions a reader would realistically ask when discovering this document.
2. For each question, invoke a sub-agent with just the document and the question. No context from this conversation.
3. Run additional checks via sub-agent: ambiguity, false assumptions, internal contradictions.
4. Report what Reader Claude got right/wrong. Fix gaps by looping back to Stage 2.

### Without sub-agents

1. Generate 5–10 realistic reader questions.
2. Give the user testing instructions: open a fresh Claude conversation at https://claude.ai, paste or link the document, ask the generated questions. For each, ask Reader Claude to note what was unclear or what background knowledge the doc assumed.
3. Also ask Reader Claude: "What might be ambiguous or unclear?", "What does this doc assume the reader already knows?", "Are there any internal contradictions?"
4. Ask what Reader Claude struggled with and loop back to Stage 2 to fix those sections.

**Exit condition:** Reader Claude consistently answers questions correctly and stops surfacing gaps.

---

## Final Review

Once Reader Testing passes:

1. Recommend a final read-through by the user — they own this and are responsible for its quality.
2. Suggest double-checking facts, links, and technical details.
3. Ask if they want one more review pass.

Final notes to share:

- Consider linking this conversation in an appendix so readers can see how the doc developed.
- Use appendices for depth without bloating the main doc.
- Update the doc as feedback comes in from real readers.

---

## Guidance notes

**Tone:** Direct and procedural. Explain rationale briefly when it affects user behaviour. Don't sell the approach — just execute it.

**Deviations:** If the user wants to skip a stage, ask if they'd prefer to go freeform. If they seem frustrated, acknowledge it and suggest ways to move faster. Always give the user agency to adjust.

**Context gaps:** Check the workspace before asking about unknown terms or projects. Don't let gaps accumulate.

**Artifact management:** `create_file` for full drafts, `str_replace` for all edits. Never use artifacts for brainstorming. Provide the artifact link after every change.
