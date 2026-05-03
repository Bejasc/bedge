---
name: doc-formatting
description: Apply Markdown and Obsidian formatting standards to documents. Use when creating or editing .md files, checking callout usage, fixing header structure, verifying link format, or reviewing emoji usage. Also use as a final formatting check before delivering any document. Trigger on "format this doc", "check the markdown", "fix the callouts", or any request to review document structure.
---

# Markdown Authoring Standards

These standards apply to all Markdown documents rendered in Obsidian and on GitHub. They define how documents look and are structured — not what goes in them.

## Callouts

A callout belongs where a reader would genuinely miss something without it: load-bearing invariants, anti-patterns, common mistakes, safety-critical rules, cross-file coupling the reader wouldn't spot from surrounding prose.

A callout is not decoration. If removing it wouldn't cost the reader anything, don't add it.

**Syntax (Obsidian-native):**
```markdown
> [!TYPE] Optional custom title
> Body of the callout. Multi-line is fine.
> Standard markdown inside (code, links, emphasis).
```

**Density:** No minimum. Soft max ~6 per document for normal-sized guides. Exceed only for long, dense guides (≥900 lines with genuinely high-density key information). More than one callout per ~150 lines usually means the prose should carry the emphasis instead.

Apply a custom title in most cases so the callout communicates its specific concern rather than just the generic type label.

**Primary palette — renders on GitHub and Obsidian:**

| Type | Typical use |
|---|---|
| `[!NOTE]` | Reference info the reader should register — neutral, not urgent |
| `[!TIP]` | A helpful pattern or shortcut |
| `[!IMPORTANT]` | Load-bearing behaviour or cross-file coupling |
| `[!WARNING]` | A mistake that corrupts state or causes data loss |
| `[!CAUTION]` | An action that is hard to reverse or has blast radius |

**Extended palette (Obsidian-only):** `INFO`, `SUCCESS`, `QUESTION`, `FAILURE`, `DANGER`, `BUG`, `EXAMPLE`, `QUOTE`. These degrade to plain blockquotes on GitHub. Use only when a primary type genuinely can't carry the meaning, and only when the audience is primarily reading in Obsidian.

## Links

- Markdown-native syntax only: `[text](path)`. No wikilinks (`[[path]]`).
- Prefer relative paths within the docs folder.
- Use section anchors (`./guide.md#section-name`) where the intent is a specific section.

## Headers

- ATX-style only: `#`, `##`, `###`. No setext-style underlines.
- Single H1 per document, matching the document title.
- No skipped levels — H3 follows H2, H2 follows H1.
- Keep headers short enough to fit on one line. If a header needs a sub-clause, put it in the first paragraph of the section instead.

## Emoji

- Sparingly, and only when they carry semantic weight: ⚠️ for a warning callout title, ✅/❌ in pass/fail tables.
- Not for section header decoration.
- If a callout already conveys the meaning via its type and title, don't add an emoji to the title as well.

## Pre-commit checklist

Before finalising a document:

- [ ] Callouts appear only where key information must not be missed. Count does not exceed ~6 unless the document is long and dense.
- [ ] Callout types match the message's intent. Titles are custom where helpful.
- [ ] Primary-palette types used unless an extended type is specifically justified.
- [ ] Links use `[text](path)` style, relative paths within docs, no wikilinks.
- [ ] Headers are ATX-style, single H1, no level skipping.
- [ ] Emoji used sparingly and only for semantic weight.
