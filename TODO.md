# TODO

## Active

## Upcoming

## Captured

### Platform / Infrastructure
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


### apps/bot
- Graceful shutdown handler (SIGINT/SIGTERM → disconnect DB + client)

### CI/CD
- Deploy workflow (VPS deploy with atomic symlink swap, following freaky pattern)
- Add `DISCORD_WEBHOOK_CI` secret to GitHub repository

## Completed

- [Plan 010 — Games, Reputation and Leaderboards](docs/plans/completed/community/2026-10-22-010-games-reputation-and-leaderboards.md) — coin flip, high/low, dice (roll, vs bot, duels) with per-game stats, opt-in points and daily rep, per-server daily limits, `/leaderboard` and `/stats`
- [Plan 009 — Starboard](docs/plans/completed/community/2026-10-22-009-starboard.md) — reaction-driven starboard with configurable channel, emoji, threshold and self-star rule, set from `/config`
- [Plan 008 — Events and Reminders](docs/plans/completed/moderation/2026-10-22-008-events-and-reminders.md) — `/event` cards with title, image, time and description, RSVP buttons, and per-event reminders into chosen channels via the TaskManager
- [Plan 007 — Embed Builder](docs/plans/completed/moderation/2026-10-22-007-embed-builder.md) — Discord-styled builder page served by `apps/api` (now ESM), draft codes with a 7-day TTL, `/post code:` with *Update original*, *Open in builder* context menu
- [Plan 006 — Posting Toolkit](docs/plans/completed/moderation/2026-10-22-006-posting-toolkit.md) — `/post` modal (channel, persona, Text/Card/JSON), webhook personas, *Edit bot message*, templates with *Save as template*
- [Plan 005 — Moderation and Cases](docs/plans/completed/moderation/2026-10-22-005-moderation-and-cases.md) — numbered cases for notes, warns, timeouts, kicks and bans (including manual actions via the audit log); `/lookup`; user context menus; action buttons on logs and the admin mirror
- [Plan 004 — Event Logging and Welcome Messages](docs/plans/completed/moderation/2026-10-22-004-event-logging-and-welcome-messages.md) — message, member, voice, invite, audit-log moderation and AutoMod logs; `/purge` with filters; configurable welcome cards
- [Plan 003 — Server Config and Admin Hub](docs/plans/completed/moderation/2026-10-22-003-server-config-and-admin-hub.md) — discord.js 14.27, per-guild config with a `/config` panel, owner/admin/mod tiers, Components V2 log renderer and router with admin-server mirroring, auto-generated `/help`
- [Plan 001 — Timezone Tracking](docs/plans/completed/bot/2026-05-03-001-timezone-tracking.md) — voice-channel time clocks per tracked member, stoplight availability system, reusable TaskManager scheduler
- Wire `@bejasc/logger` into `apps/bot` — wrote `ILogger` adapter in `src/lib/logger.ts`, converted bot to ESM (`"type": "module"`, `NodeNext` module resolution), added workspace dep
