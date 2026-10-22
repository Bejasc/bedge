---
plan: 007
title: Embed Builder
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: [006]
---

# Plan 007 — Embed Builder

**Depends on:** Plan 006 — the JSON post format, `/post`, persona sending and bot-message editing
**Feeds into:** Nothing downstream; it completes the posting half of the Dyno replacement
**Outcome:** Admins can design a message in a Discord-styled browser page served by `apps/api`, save it as a short draft code, and post it with `/post code:…` — or open an existing bot message in the builder and push the changes back.

A modal is fine for a quick announcement but miserable for a rich embed or a Components V2 layout. This plan gives bedge a proper editor with a live preview, without building a dashboard or a login system.

## Context

Plan 006 made JSON the lingua franca: any Discord message payload can be posted or edited through `buildPostPayload('json', …)`. The builder only has to produce that JSON and park it somewhere the bot can read it.

`apps/api` is still the NestJS scaffold from the repo's start. It's CommonJS, but `@bedge/database` and `@bedge/types` are ESM, so the API moves to ESM (as the bot did) to share the Mongo models instead of duplicating them.

The bot and the API share MongoDB, so drafts live there; the bot reads them directly rather than calling the API over HTTP.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Page | Static HTML/CSS/JS in `apps/api/public/builder/`, served at `/builder` via Nest's Express static assets. JSON editor with snippet buttons (Text, Embed, Card, Field, Buttons) and a live Discord-styled preview of content, embeds and Components V2 | Settled: static page served by apps/api. A JSON editor plus snippets covers everything Discord supports without a form for every field (assumed overnight) |
| Drafts | `Draft` model in `@bedge/database`: code, payload, optional source message (guild, channel, message), 7-day TTL index | Settled: draft codes. A week is long enough to finish a post (assumed overnight) |
| Draft codes | 8 characters from an unambiguous alphabet (no `0/O/1/I/L`) | Easy to type into `/post code:`, ~10¹² space (assumed overnight) |
| API | `POST /api/drafts` (validates against `PostPayloadSchema`, 64 KB body cap, 30 requests/minute/IP) and `GET /api/drafts/:code` | Public but bounded; there is no login to protect (assumed overnight) |
| Draft privacy | Anyone holding a code can read the draft | Codes are unguessable in practice and drafts expire; no auth system exists to gate them (assumed overnight) |
| API module format | Convert `apps/api` to ESM (`"type": "module"`, NodeNext) | Required to import the ESM workspace packages; the scaffold is two files (assumed overnight) |
| `/post code:` | Posts the draft directly (no modal) to the `channel` option or the current channel, optionally as a `persona`. If the draft came from *Open in builder* and the source message is still editable, bedge offers *Update original* or *Post as new* | Drafts are often longer than a modal's 4000 characters (assumed overnight) |
| *Open in builder* | Message context menu (admin). Saves the message's payload as a draft with its source and replies with the builder link | Settled scope. Message slots after this plan: 3/5 |
| Builder URL | `BUILDER_URL` env var on the bot (e.g. `https://bedge.example.com`). When unset, replies give the code and say the builder isn't configured | Deployment-specific and not something the bot can work out (assumed overnight) |
| Running the API | Added as an `api` service in `docker-compose.yml` (same image, `apps/api` working dir, port 3000). Production compose and reverse proxy are a manual step | Lets `docker compose up` run everything locally; prod hosting is Ben's call (assumed overnight) |
| Shared draft helpers | Code generation, create and find live in `@bedge/database` (`drafts.ts`), used by both the API and the bot | *Open in builder* mints codes from the bot too; one implementation avoids drift (assumed overnight) |
| Compose env for the API | `MONGODB_URI` and `PORT` set inline, no `env_file` | The local Compose version can't mark an env file optional, and a required one would break `docker compose up` for anyone without `apps/api/.env` (assumed overnight) |
| Markdown in preview | A small escaping renderer: bold, italic, underline, strike, code, code blocks, headings, `-#` subtext, quotes, lists, links (http/https only), mentions as pills. Everything is HTML-escaped first | Drafts can be opened by anyone with a code, so the preview must be XSS-safe (assumed overnight) |

## Open Questions

None — all resolved.

## Phase 1 — API foundation and drafts

- [x] Convert `apps/api` to ESM; add `@bedge/database` and `@bedge/types` as workspace deps; connect to Mongo on boot (`MONGODB_URI`)
- [x] `Draft` schema and model with TTL
- [x] Pure draft-code generator and in-memory rate limiter, with tests
- [x] `DraftsController`: create and fetch, validated, rate limited
- [x] `/builder` static hosting; `.env.example` for the API; `api` service in `docker-compose.yml`

**Exit criteria:** `curl` can create a draft and read it back; `/builder` serves the page.

## Phase 2 — Builder page

- [x] Discord-styled layout: editor pane, preview pane, save bar; dark theme matching Discord
- [x] Preview renderer for content, embeds and Components V2, in an ES module the tests can import
- [x] Snippet buttons, live JSON validation, *Save draft* with the code and a copy button, `?code=` loading
- [x] Renderer tests: markdown escaping (no HTML injection), links restricted to http(s), embed and V2 rendering

**Exit criteria:** A draft loaded by code renders like Discord would show it, and saving returns a new code.

## Phase 3 — Bot integration

- [x] `/post code:` with `channel` and `persona` options; *Update original* / *Post as new* buttons for drafts with a source
- [x] *Open in builder* message context menu
- [x] `BUILDER_URL` in the bot config and `.env.example`

**Exit criteria:** A bot post opened in the builder, changed, and applied with `/post code:` updates in place.

## Out of Scope

- Accounts, login or per-server permissions on the web side
- A form-based editor for every embed field
- Image uploads from the builder
- Scheduled posts (settled: out)

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including API and renderer tests
- [ ] `/builder` looks like Discord and previews text, an embed and a V2 card correctly (live check)
- [ ] *Save draft* → `/post code:` posts the message (live check)
- [ ] *Open in builder* on a bot post → edit → `/post code:` → *Update original* edits it in place (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Live-check acceptance items stay unticked here and are covered by the combined guide in `docs/acceptance/`.
- Smoke-tested the compiled API against a throwaway Mongo container: create, validation errors, case-insensitive fetch, 404, the 64 KB cap and static serving of `/builder/` all behaved. The page itself wasn't viewed in a browser (the browser extension wasn't connected), so its look is a live check.
- Manual setup: deploy `apps/api` publicly (production compose and reverse proxy aren't in this plan) and set `BUILDER_URL` on the bot.
- Context menu budget after this plan: user 3/5, message 3/5.
