---
plan: 006
title: Posting Toolkit
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: [003]
---

# Plan 006 — Posting Toolkit

**Depends on:** Plan 003 — tiers (posting is admin), Components V2 renderer and the log router
**Feeds into:** Plan 007, whose embed builder hands drafts to `/post` and opens existing bot messages for editing
**Outcome:** Admins can post and edit messages as the bot or as a saved webhook persona, in plain text, a Components V2 card, or raw JSON, from a modal or a saved template.

Dyno's embed and announcement commands were the other half of why Ben's servers keep it. This plan replaces them with something nicer to use: one modal with a channel picker, persona picker and format picker, and an *Edit bot message* context menu so nothing has to be reposted to fix a typo.

## Context

Plan 003 upgraded discord.js so modals can hold select menus (Label components). That makes a single *Post as bot* modal possible: pick the channel, pick a persona, pick the format, type the content.

Personas are webhooks with a per-message name and avatar. bedge owns one webhook per channel and reuses it, so personas don't pile up webhooks.

Plan 003's Decisions Log puts posting at admin tier. The context-menu budget (Plan 004 Decisions Log) gives this plan two message slots.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Entry point | `/post [template]` opens one modal: Channel (channel select, defaults to the current channel), Persona (string select), Format (string select), Content (paragraph) | Everything on one screen; no IDs to type (assumed overnight) |
| Formats | *Text* (plain content), *Card* (Components V2 container with the brand accent), *JSON* (a raw message payload: `content`, `embeds`, `components`, `flags`) | Covers quick announcements, good-looking posts and full control; JSON is how the Plan 007 builder hands over (assumed overnight) |
| Components V2 in JSON | If any component is a V2 type, the `IsComponentsV2` flag is set automatically and `content`/`embeds` are rejected with a clear error | Discord forbids mixing them; failing early beats a cryptic API error (assumed overnight) |
| Personas | `/persona add·remove·list` (admin). Name plus an avatar **URL**; stored per server | Attachment URLs from Discord expire, so an uploaded avatar would break within a day (assumed overnight) |
| Webhook ownership | One bedge-owned webhook per channel named "BedgeBot Personas", created on first use and reused; thread posts use `threadId` on the parent's webhook | Avoids hitting the 15-webhooks-per-channel limit (assumed overnight) |
| *Edit bot message* | Message context menu. Works on messages sent by bedge itself or by its persona webhook. Opens the same modal, prefilled, with Format inferred (V2 → JSON, embeds → JSON, otherwise Text) | One editing path for every kind of post (assumed overnight) |
| Templates | `/template save·list·delete` and a *Save as template* message context menu. A template stores format and content; `/post template:` (autocomplete) prefills the modal | Reuse without retyping; editable before sending (assumed overnight) |
| Mentions in posts | Users, roles and `@everyone` ping as written | Posting is admin-only and announcements need pings; anything typed is intended (assumed overnight) |
| Failed posts | Any error reply echoes the submitted content back in a code block | A modal can't be reopened with its old values, so nothing typed is lost (assumed overnight) |
| Logs | `post.create` and `post.edit` in the `server` category, with a Jump link; persona and template changes log as `server.config` | Admin actions should be auditable like any other (assumed overnight) |
| Context menus | *Edit bot message* and *Save as template* (message). Budget after this plan: user 3/5, message 2/5 | Leaves room for Plan 007's *Open in builder* |

## Open Questions

None — all resolved.

## Phase 1 — Payloads and storage

- [x] `PostPayload` Zod schema in `packages/types` (content ≤ 2000, embeds ≤ 10, components, flags)
- [x] `Persona` and `PostTemplate` schemas and models, unique on guild + name
- [x] Pure `buildPostPayload(format, content)` returning a payload or a readable error, with tests for each format and the V2 rules
- [x] Pure `inferFormat(message-like)` for editing, with tests

**Exit criteria:** Every format turns into a valid payload or a clear error, under test.

## Phase 2 — Posting and personas

- [x] Persona webhook helper: get-or-create the channel webhook, send and edit through it, thread aware
- [x] `/persona add·remove·list`
- [x] `/post` modal and its submit handler; `post.create` log

**Exit criteria:** An admin can post text, a card and JSON, as the bot or a persona, into any channel they pick.

## Phase 3 — Editing and templates

- [x] *Edit bot message* context menu, prefilled modal, edit via bot or webhook; `post.edit` log
- [x] `/template save·list·delete` and the *Save as template* context menu
- [x] `/post template:` autocomplete and prefill

**Exit criteria:** A posted message can be edited in place, and a saved template can be posted again with changes.

## Out of Scope

- Scheduled posts, sticky messages and reaction roles (settled: out)
- The browser embed builder and draft codes (Plan 007)
- Uploading files or images with a post
- Interactive buttons on posted messages other than link buttons

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including payload, V2-rule and format-inference tests
- [ ] `/post` sends Text, Card and JSON posts as the bot and as a persona (live check)
- [ ] *Edit bot message* edits both a bot post and a persona post in place (live check)
- [ ] A template saved from a message can be posted again via `/post template:` (live check)
- [ ] A mod can't use `/post`, `/persona` or `/template` (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Live-check acceptance items stay unticked here and are covered by the combined guide in `docs/acceptance/`.
- Untested against the live API: converting an existing classic message to a Components V2 one on edit (and back, which Discord forbids). The edit sends a full replacement; a rejection is shown to the user with their content.
- The bot needs *Manage Webhooks* for personas.
- Context menu budget after this plan: user 3/5, message 2/5.
