---
plan: 003
title: Server Config and Admin Hub
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: []
---

# Plan 003 — Server Config and Admin Hub

**Depends on:** Nothing — this is a starting point
**Feeds into:** The Dyno-replacement roadmap — event logging, moderation and cases, the posting toolkit, the API embed builder, and events. Each of these reads guild config, gates on permission tiers, and writes through the log router built here.
**Outcome:** The bot can join any of Ben's servers, be configured from a `/config` panel, gate commands by owner/admin/mod tier, and post good-looking Components V2 logs to the right channel locally and mirrored to the admin server.

bedge is replacing Dyno across every server Ben runs, SWRPG and SC Australis among them. Before any logging or moderation feature can land, three things have to exist: per-server config, a permission model, and a single place logs are rendered and routed. Getting the log look right once means every later feature inherits it for free.

## Context

Ben is the only owner but runs many servers, some with their own mod teams. Each server needs its own log channels and role tiers. All activity is also ghost-logged to one central admin server, so Ben can watch everything from one place. Notes and cases stay visible only in their own server (plan 005), but their logs still mirror to the admin server.

Log presentation follows the [drpg-logger](https://github.com/Bejasc/drpg-logger) style: an emoji-prefixed title, a colour and thumbnail per log type, the subject user as author, a jump link, a branded footer and a timestamp. Here it is rebuilt on Components V2 rather than classic embeds. `packages/logger`'s `DiscordTarget` is an ops/error logger posting through a webhook, which is a different job; server event logs get their own renderer in the bot.

The bot runs on `discord.js ^14.16.3`, which predates Components V2 and select menus inside modals. Both are needed here and by the posting toolkit.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Plan domain | New `moderation` domain | Groups the six-plan Dyno-replacement roadmap apart from the timezone work |
| Permission model | Owner + two role tiers per server: `mod` and `admin` | Fixed capability sets are enough for one owner; per-capability roles are config overhead with no current need |
| Tier capabilities | Mod: notes, warns, timeouts, purge, lookup. Admin: everything mod has, plus kick, ban, config, posting. Owner: everything, everywhere | Matches how Ben delegates today |
| Owner identity | `OWNER_ID` env var | Explicit, and independent of who owns the Discord application |
| Footer branding | Text "BedgeBot" with the bot avatar ([assets/bedgebot.png](../../../assets/bedgebot.png)) uploaded as an application emoji and shown inline: `-# <:bedgebot:id> BedgeBot • <t:…:f>` | Components V2 has no footer-with-icon; an application emoji works in every server without per-message uploads |
| Admin server identity | Env vars `ADMIN_GUILD_ID` and `ADMIN_LOG_CHANNEL_ID` | Set at deploy time and can't be changed by accident from inside Discord |
| Admin mirror layout | One channel. Each mirrored log shows the source server's icon and name, with Jump buttons to the source message and to the local log | Easy to scan; the server icon makes the origin obvious at a glance |
| Log format | Components V2 (container + accent colour, section with thumbnail, text, separators, link buttons) | Looks best; buttons sit in the same layout, which plan 005's action buttons need |
| Log routing granularity | Per category: `messages`, `members`, `moderation`, `voice`, `server`. Each has an optional channel and an on/off toggle; an unset channel falls back to the server's default log channel | Enough control without per-event config sprawl |
| `/config` UX | One interactive, ephemeral panel: section select, channel and role pickers, toggles, and a *Send test log* button | Nothing to remember; the whole config is visible at once |
| Admin mirror when the local log is skipped | The mirror is always posted; a disabled or unconfigured category skips only the local copy, and the mirror then has no *Jump to log* button | Every log is ghost-logged to the admin server, so Ben sees activity even where a server hasn't been configured yet (assumed overnight) |
| Brand emoji lookup | Fetched by name (`bedgebot`) from the application's emojis on `ready`; no constant or env var. Footer falls back to text only when it's missing | Works across dev and prod applications without config; the only manual step is the upload (assumed overnight) |
| Tier metadata | A `tiered(tier)` helper sets both the Sapphire precondition and a `tier` command option that `/help` reads | One declaration per command, so help and the gate can't drift (assumed overnight) |
| `default_member_permissions` per tier | Mod → Manage Messages, Admin → Manage Server, Owner → Administrator | Hides commands from most members in Discord's UI; the precondition remains the real gate (assumed overnight) |
| `/config` logging layout | Default-channel picker, then a category select that drives one channel picker and an enable/disable button; deselecting a channel reverts to the default | Five categories with their own pickers would exceed the 40-component limit (assumed overnight) |
| `guildDelete` during outages | Ignored when the guild is merely unavailable | Discord emits `guildDelete` for outages too; only real removals should alert (assumed overnight) |
| JSON Schema generator | `unrepresentable: 'any'` so date fields don't crash `pnpm generate:schema` | The existing availability schema already broke the script under zod 4.4 (assumed overnight) |
| Edit/delete history | Use discord.js's cached old/new message in `messageUpdate`/`messageDelete`; no message store | Ben's SWRPG bot already works this way. Messages sent before a restart log without their old content, which is acceptable |

## Open Questions

None — all resolved.

## Phase 1 — Foundations

- [x] Upgrade `discord.js` to the latest 14.x that supports Components V2 and select menus inside modals (Label components). Upgrade `@sapphire/framework` alongside if it needs to match
- [x] Re-run the existing bot tests and smoke-test `/ping`, `/time` and `/availability` after the upgrade — tests pass and every compiled module imports; the live smoke test is in the acceptance guide
- [x] `GuildConfig` Zod schema in `packages/types/src/schemas/guild-config.ts`, covering default log channel, per-category `{ channelId?, enabled }`, mod and admin role IDs, and timestamps
- [x] `GuildConfigModel` in `packages/database/src/models/`, unique on `guildId`
- [x] `pnpm generate:schema` run, with the generated schema committed if it maps to a data file
- [x] `OWNER_ID` (required), `ADMIN_GUILD_ID` and `ADMIN_LOG_CHANNEL_ID` (optional; mirroring is skipped when unset) added to `config.ts` and documented in `.env.example`
- [x] `assets/bedgebot.png` uploaded as the `bedgebot` application emoji in the Developer Portal; its ID goes in a `BRAND_EMOJI` constant (or env var if it varies between dev and prod apps) — superseded: the bot looks the emoji up by name at startup (see Decisions Log). The upload itself is a manual step

**Exit criteria:** The upgraded bot starts, the existing commands work, and the schema and model build.

## Phase 2 — Permission tiers

- [x] A pure `resolveTier(member, config, ownerId)` that returns `owner | admin | mod | none`. Discord's Administrator permission counts as `admin` when no admin role is configured, so a fresh server isn't locked out
- [x] Sapphire preconditions: `OwnerOnly`, `AdminTier`, `ModTier`
- [x] Commands also set `default_member_permissions` as a coarse first filter. The preconditions are the real gate
- [x] Unit tests for `resolveTier` covering each tier, unset roles, and the Administrator fallback

**Exit criteria:** A command marked `ModTier` rejects a member with no tier role and accepts a mod, an admin and the owner.

## Phase 3 — Log renderer and router

- [x] Log type registry: `{ key, category, emoji, title, accentColour, thumbnail? }`. Seed it with a test type; plans 004–008 add their own
- [x] Renderer: `(type, payload) → Components V2 message`. Container with an accent colour; a section with the title (`emoji Title — subject`) and the subject's avatar as thumbnail; body text; optional fields as compact text blocks; a separator; the branded footer line (see Decisions Log); and link buttons (*Jump to message*, plus any extras). Long content is truncated cleanly, as drpg-logger did
- [x] Mirror variant: the same body, with the source server's icon and name as the section header, plus *Jump to source* and *Jump to log* buttons
- [x] Router: `log(guild, typeKey, payload)` resolves the category's channel, falls back to the default channel, skips the log if the category is disabled, sends, then mirrors to the admin channel with the local log's URL. The admin server's own events don't mirror to itself
- [x] A missing or inaccessible channel is caught and logged through the app logger, never thrown into the calling listener
- [x] Unit tests for channel resolution (category → default → none, disabled category, admin-guild self-mirror) and for renderer truncation

```ts
// Shape sketch — not final
await logRouter.log(guild, 'message.delete', {
  subject: message.author,
  body: message.content,
  fields: [{ name: 'Channel', value: `<#${message.channelId}>` }],
  links: [{ label: 'Jump to context', url: message.url }],
});
```

**Exit criteria:** One call to `log()` produces a well-formed log in the right local channel and a mirrored copy in the admin channel.

## Phase 4 — `/config` panel and guild lifecycle

- [x] `/config` (AdminTier) opens an ephemeral Components V2 panel showing the current config, with a section select: Logging, Roles
- [x] Logging section: a default-channel picker, plus a channel picker and on/off toggle for each category
- [x] Roles section: role pickers for the mod and admin tiers
- [x] *Send test log* button, which fires the test log type through the router so routing and mirroring can be checked live
- [x] Every config change writes to Mongo and posts a `server.config` log
- [x] `guildCreate`: create a default config and post a "bot joined" notice to the admin server. `guildDelete`: post a "bot removed" notice and keep the config

**Exit criteria:** A new server can be fully configured from the panel without typing an ID, and the test log lands where the config says.

## Phase 5 — `/help`

- [x] `/help` lists commands and context-menu actions, generated from Sapphire's command store, grouped by category directory, and filtered to the caller's tier
- [x] Each command carries a short description and a required tier as metadata, the single source the help output reads from
- [x] Rendered as a Components V2 message in the same visual style as the logs

**Exit criteria:** `/help` as a mod shows mod commands only; as the owner it shows everything; a new command appears without editing the help code.

## Out of Scope

- Any real event logging (joins, edits, deletes, audit log, voice, invites, AutoMod). That's the next plan
- Notes, cases, warns, kick/ban/timeout, lookup, and action buttons on logs
- Posting as the bot, webhook personas, templates, and the embed builder
- Events and reminders
- A web dashboard for config
- Per-capability role mapping beyond the two tiers
- A persistent message store for edit/delete history

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including the new `resolveTier`, routing and renderer tests
- [ ] The existing timezone commands still work after the discord.js upgrade (manual smoke test)
- [ ] In a test server: configure the default log channel, set one category to its own channel, set mod and admin roles, all from `/config`
- [ ] *Send test log* appears in the configured channel, styled like the drpg-logger look, and a mirrored copy appears in the admin channel with the source server's icon. Both Jump buttons go to the right places
- [ ] Disabling the test log's category stops the local log
- [ ] A member with no tier role can't open `/config`; a mod can't either; an admin can
- [ ] Adding the bot to a new server posts a join notice in the admin server
- [ ] `/help` output differs correctly between mod, admin and owner
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Acceptance items that need a live Discord server are left unticked here and covered by the combined guide in `docs/acceptance/`; the plan was closed at Ben's request so the roadmap could proceed.
- Upgraded `discord.js` to `^14.27.0` and `@sapphire/framework` to `^5.5.1`. Lockfile stays at v9 (installed with pnpm 10 to match the existing store).
- Manual setup: set `OWNER_ID`, `ADMIN_GUILD_ID` and `ADMIN_LOG_CHANNEL_ID`; upload `assets/bedgebot.png` as an application emoji named `bedgebot`.
- Log types added by later plans register themselves in `apps/bot/src/lib/logs/log-types.ts`.
