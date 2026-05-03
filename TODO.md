# TODO

## Active

- [Plan 001 — Timezone Tracking](docs/plans/bot/2026-05-03-001-timezone-tracking.md) — voice-channel time clocks per tracked member, stoplight availability system, reusable TaskManager scheduler.

## Upcoming


## Captured

### Platform / Infrastructure
- Migrate bot's `lib/database.ts` to import from `@bedge/database` package
- Define guild config Zod schema in `packages/types` + generate JSON schema
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

### apps/bot — Discord Bot
- `/post-embed` — accept JSON payload, delete invoking message, post embed in its place
- `/config` — per-guild channel and feature toggle management
- Join/leave message logging with per-guild channel config
- Message edit and delete logs (before/after diff)
- Moderation event logs — bans, kicks, timeouts, unbans
- Warn system — `/warn`, `/warns`, `/clearwarns`, stored in MongoDB
- Graceful shutdown handler (SIGINT/SIGTERM → disconnect DB + client)

### CI/CD
- Deploy workflow (VPS deploy with atomic symlink swap, following freaky pattern)
- Add `DISCORD_WEBHOOK_CI` secret to GitHub repository

## Completed

- Wire `@bejasc/logger` into `apps/bot` — wrote `ILogger` adapter in `src/lib/logger.ts`, converted bot to ESM (`"type": "module"`, `NodeNext` module resolution), added workspace dep
