# TODO

## Active

## Upcoming


## Captured

### Platform / Infrastructure
- Add `@bedge/types` and `@bedge/database` as workspace deps to bot and api
- Set up `docs/` directory with architecture overview and integration docs
- Add Docker multi-stage build optimisation (deps → builder → runner)
- Docker health check endpoint for the api

### apps/api — Webhook Relay & Integrations
- NestJS webhook ingestion endpoint with request signature verification
- GitHub integration — receive PR/push events, transform to human-readable Discord embeds
- Todoist integration — task completed/assigned events to Discord
- Atlassian integration — Jira issue events, Confluence page updates
- Per-integration routing config (which webhook fires to which Discord channel)
- Integration configs stored in MongoDB via `@bedge/database`


### apps/bot — Dyno replacement roadmap (after Plan 003)
- Event logging — join/leave, message edit/delete (cached old/new), audit-log mod events (kick/ban/timeout/unban), member nickname/role changes, voice join/leave/move, invite tracking, AutoMod forwarding, `/purge` with filters
- Moderation and cases — notes, warns, kick/ban/timeout as numbered cases, visible only in their own server and ghost-logged to the admin server; *Lookup*; action buttons on forwarded logs; user context menus (*Add note*, *Lookup*, *Moderate…*)
- Posting toolkit — *Post as bot* (modal + channel select), webhook personas (saved name + avatar), *Edit bot message*, saved templates, Components V2 support, JSON posting
- Embed builder (apps/api) — static Discord-styled preview page, draft codes for `/post code:…`, *Open in builder* message context menu
- Events — title, image, time, description, RSVP; configurable reminder posts into chosen channels
- Graceful shutdown handler (SIGINT/SIGTERM → disconnect DB + client)

### CI/CD
- Deploy workflow (VPS deploy with atomic symlink swap, following freaky pattern)
- Add `DISCORD_WEBHOOK_CI` secret to GitHub repository

## Completed

- [Plan 003 — Server Config and Admin Hub](docs/plans/completed/moderation/2026-10-22-003-server-config-and-admin-hub.md) — discord.js 14.27, per-guild config with a `/config` panel, owner/admin/mod tiers, Components V2 log renderer and router with admin-server mirroring, auto-generated `/help`
- [Plan 001 — Timezone Tracking](docs/plans/completed/bot/2026-05-03-001-timezone-tracking.md) — voice-channel time clocks per tracked member, stoplight availability system, reusable TaskManager scheduler
- Wire `@bejasc/logger` into `apps/bot` — wrote `ILogger` adapter in `src/lib/logger.ts`, converted bot to ESM (`"type": "module"`, `NodeNext` module resolution), added workspace dep
