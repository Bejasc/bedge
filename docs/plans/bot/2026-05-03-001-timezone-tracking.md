---
plan: 001
title: Timezone Tracking
status: active
date: 2026-05-03
updated: 2026-05-03
domain: bot
depends: []
---

# Plan 001 — Timezone Tracking

**Domain:** bot
**Depends on:** Nothing — this is a starting point
**Feeds into:** A reusable `TaskManager` scheduler that subsequent bot features can register jobs into; a deployed `/time` command group with live voice-channel clocks per tracked member
**Outcome:** Guild admins can track members' timezones with auto-updating locked voice channels, and any member can query rich time and availability info via slash commands.

Server administrators can register a member's timezone once; the bot maintains a locked voice channel in a chosen category that always shows the member's current time rounded to the nearest 15 minutes. Availability windows give each member a stoplight indicator visible at a glance across the category. It's a passive, always-visible clock wall that needs no ongoing maintenance.

---

## Context

The bedge-bot serves a group distributed across timezones. The recurring friction is knowing whether it's a reasonable hour to message or schedule something with another person. Voice channels used as "status strips" are a Discord convention for this — they're always visible in the sidebar and require no interaction to read. The stoplight system extends this by encoding each person's own availability config into a single emoji, so the answer to "would I expect them to be around?" is immediate.

This plan also introduces the first reusable scheduled-task infrastructure for the bot. The `TaskManager` wrapper around `node-cron` should be designed so future features (reminders, digest posts, etc.) can register named jobs without touching the core bot startup.

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Scheduler library | `node-cron` | Lightweight, no extra infrastructure — no Redis required. Correct tool for simple recurring in-process jobs. |
| Timezone input format | Flexible — UTC offsets (`UTC+9:30`), abbreviations (`CST`), IANA strings | User preference; a parsing layer normalises all forms to IANA at write time |
| Timezone parsing library | `spacetime` (primary) | Handles offsets, abbreviations, and IANA; good DST awareness; actively maintained |
| Normalised storage | IANA string | DST-safe canonical form; computed from user input at save time and shown in the confirm step |
| Channel update interval | 15 minutes (global) | Per-server configurability deferred; 15m gives acceptable freshness |
| Time display | 24-hour, rounded to nearest 15m | User requirement |
| Availability layers | Broad + weekday override | Public holidays and one-off dates are out of scope |
| Stoplight representation | Emoji circle in channel name; embed color in `/time info` | Channel name: fast sidebar scan. Embed: richer detail when queried |
| Confirm step | Ephemeral Discord button interaction before any save | Catches bad timezone parses; shows resolved IANA name and current offset before committing |
| Admin commands | `/time track`, `/time untrack` require `ManageGuild` permission | Server admins own the channel configuration |
| Self-service | `/time availability` usable by the member themselves; admins can set for others | Personal availability is the member's data |
| Midnight-crossing windows | `end < start` → end resolves to next-calendar-day | e.g. Friday `18:00–02:00` means Saturday 02:00 in the member's timezone |
| Stoplight level assignment | Each configured window carries an explicit level (`green`/`yellow`/`orange`/`red`); no gradient or proximity computation | "Exact match to whatever the user configured" — the stoplight reflects intent, not inference |
| Times outside all windows | Default to 🔴 Unavailable | Conservative fallback; anything unscheduled is considered unavailable |
| `/time info` access | Command is restricted to tracked members only | Untracked members have no timezone context to display |
| Missing `ManageChannels` permission | Surface a user-facing ephemeral error describing the missing permission | Silent failure is harder to diagnose in a server admin workflow |

---

## Open Questions

None — all resolved.

---

## Phase 1 — Foundation: Schemas, Models, and Workspace Wiring

- [x] Add `@bedge/types` and `@bedge/database` as workspace dependencies in `apps/bot/package.json`
- [x] Remove the duplicate `apps/bot/src/lib/database.ts` and import `connectDatabase` / `disconnectDatabase` from `@bedge/database` in `apps/bot/src/index.ts`
- [x] Define `TimeTrackConfigSchema` Zod schema in `packages/types/src/schemas/time-track-config.ts`
  - Fields: `guildId`, `memberId`, `timezone` (IANA string), `categoryId`, `channelId` (populated after creation), `alias`, `createdAt`
- [x] Define `AvailabilityConfigSchema` Zod schema in `packages/types/src/schemas/availability-config.ts`
  - `AvailabilityLevel` enum: `green | yellow | orange | red`
  - `AvailabilityWindow`: `{ start: HH:mm, end: HH:mm, level: AvailabilityLevel }`
  - Fields: `guildId`, `memberId`, `broad` (`AvailabilityWindow[]`), `weekdays` (map of 0–6 to `AvailabilityWindow[] | null`)
  - Multiple windows per layer are allowed so users can express e.g. green 9–18, yellow 18–21, orange 21–23; current time matched against the first window it falls in; no match = 🔴
- [x] Add Mongoose model for `TimeTrackConfig` in `packages/database/src/models/time-track-config.ts`
- [x] Add Mongoose model for `AvailabilityConfig` in `packages/database/src/models/availability-config.ts`
- [x] Export both models from `packages/database/src/index.ts`
- [x] Run `pnpm generate:schema` and commit generated `.schema.json` files

**Exit criteria:** `pnpm build` passes across all packages; bot imports DB helpers from `@bedge/database`; no duplicate database code in `apps/bot/src/lib/`

---

## Phase 2 — Task Scheduler

- [x] Install `node-cron` in `apps/bot`
- [x] Create `apps/bot/src/lib/task-manager.ts` — a `TaskManager` singleton with `register(name, cronExpression, fn)` and `deregister(name)` methods; logs job start/stop via `BotLogger`
- [x] Instantiate and export `taskManager` from `apps/bot/src/index.ts` after DB connect, before client login
- [x] Register the channel-update job (`*/15 * * * *`) during startup, passing it the Sapphire client reference so it can access the Discord API

Sketch:
```ts
// lib/task-manager.ts
import cron from 'node-cron';

export class TaskManager {
  private tasks = new Map<string, cron.ScheduledTask>();
  register(name: string, expression: string, fn: () => void | Promise<void>) { … }
  deregister(name: string) { … }
}
export const taskManager = new TaskManager();
```

**Exit criteria:** Bot starts up; `TaskManager` logs job registration; the cron tick fires on schedule (verify with a debug log statement before removing)

---

## Phase 3 — `/time track` and `/time untrack` Commands

- [x] Create `apps/bot/src/commands/time/track.ts` — admin-only (`ManageGuild`), subcommand of a `time` command group
- [x] Implement timezone parsing helper `apps/bot/src/lib/timezone.ts`
  - Accept raw input string; attempt parse via `spacetime` (IANA, offset, abbreviation)
  - Return `{ ianaZone: string, displayName: string, currentOffset: string } | null`
- [x] On `/time track @member <zone> <categoryId> <alias>`:
  1. Parse and resolve timezone; if null, reply with parse error
  2. Post ephemeral confirmation embed showing: member, resolved timezone name, current offset, alias, category — with a ✅ Confirm and ❌ Cancel button
  3. On confirm: create a locked voice channel in the category (no `Connect` permission for `@everyone`); name it `<alias> approx time: --:--`; save `TimeTrackConfig` to MongoDB with the new `channelId`
  4. Trigger an immediate channel-name update so the time shows correctly without waiting for the cron tick
- [x] Create `apps/bot/src/commands/time/untrack.ts` — admin-only
  - Look up `TimeTrackConfig` for the member in this guild
  - If found: delete the voice channel (if it still exists); remove the config document; reply confirming removal
  - If not found: reply with "no tracking config found for that member"

**Exit criteria:** Admin can track a member and a correctly-named locked voice channel appears; admin can untrack and the config is removed

---

## Phase 4 — Channel Update Job

- [ ] Implement `apps/bot/src/jobs/update-time-channels.ts`
  - Query all `TimeTrackConfig` documents from MongoDB
  - For each config, compute current time in member's timezone (via `spacetime` or `Intl`), round to nearest 15m, format as `HH:mm` (24h)
  - Query `AvailabilityConfig` for the member; if found, compute the stoplight dot (🔴🟠🟡🟢) based on current local time vs availability windows — see stoplight logic below
  - Attempt to fetch the voice channel by `channelId`; if missing, create it in `categoryId` with the locked permission
  - Set channel name to `<alias> approx time: <HH:mm>` (no dot if no availability config), or `<alias> approx time: <HH:mm> 🟢` (with dot if configured)
  - Discord rate-limits channel renames to 2 per 10 min per channel — the 15-min tick stays well within this; log a warning if a rename fails
- [ ] Wire the job into `TaskManager` during startup

**Stoplight logic:**
Walk the weekday layer first (if a weekday array exists for the current day), then fall back to the broad layer. Find the first `AvailabilityWindow` the current local time falls in; use its `level`. If no window matches in either layer, default to 🔴. For overnight windows (`end < start`), treat end as next-calendar-day before comparison.

**Exit criteria:** Channel names update every 15 minutes; if the channel is manually deleted it is recreated on the next tick; no rate-limit errors in normal operation

---

## Phase 5 — `/time availability`

- [ ] Create `apps/bot/src/commands/time/availability.ts`
- [ ] Subcommands:
  - `/time availability add-broad <start> <end> <level> [member]` — append a window to the broad layer; level is a choice: `green | yellow | orange | red`; member defaults to self; admins can specify another member
  - `/time availability add-weekday <day> <start> <end> <level> [member]` — append a window to a weekday override
  - `/time availability clear-broad [member]` — remove all broad windows
  - `/time availability clear-weekday <day> [member]` — remove all windows for a given weekday
  - `/time availability clear [member]` — remove the entire availability config
  - `/time availability view [member]` — show current config as an embed, listing all windows per layer with their levels
- [ ] Input: time strings in `HH:mm` format (24h); validate and store
- [ ] For overnight windows (`end < start`): treat end as next-calendar-day — confirm this to the user in the interaction response so intent is clear
- [ ] Confirmation button before saving, showing a summary of the window being added

**Exit criteria:** A member can set their own availability; an admin can set it for another member; weekday overrides override the broad layer at runtime

---

## Phase 6 — `/time info`

- [ ] Create `apps/bot/src/commands/time/info.ts`
- [ ] Query `TimeTrackConfig` and `AvailabilityConfig` for the target member in this guild
- [ ] Build an embed containing:
  - Member display name + avatar thumbnail
  - Current local time (live, not rounded) and date in their timezone
  - Timezone name and UTC offset
  - Availability status: stoplight emoji + label — derived from the same window-match logic as the channel dot
    - 🟢 Definitely available / 🟡 Maybe available / 🟠 Probably unavailable / 🔴 Unavailable
  - If the command invoker is also tracked: a second row showing their current time, for manual comparison
- [ ] Embed color matches the stoplight level: green / yellow / orange / red
- [ ] If the target member has no tracking config, reply with an ephemeral error (tracked members only)

**Exit criteria:** `/time info @member` returns a correctly-styled embed; stoplight and embed color match the channel dot; works whether or not the invoker is tracked

---

## Out of Scope

- Per-server configurable update interval (defaulting to 15 minutes globally)
- Public holiday or one-off date overrides in availability config
- A shared / combined availability view across multiple members (users compare channel dots manually)
- Timezone abbreviation disambiguation UI (confirm step shows resolved IANA name — user must re-run with a different input if wrong)
- timeanddate.com links or any third-party time comparison service

---

## Acceptance Criteria

- [ ] `/time track @member <zone> <categoryId> <alias>` creates a locked voice channel; config persists in MongoDB
- [ ] Timezone input accepts UTC offsets, abbreviations, and IANA strings; resolved IANA zone is shown in the confirm step before saving
- [ ] Voice channel name updates every 15 minutes without manual intervention
- [ ] If the tracked voice channel is deleted, the next cron tick recreates it
- [ ] `/time untrack @member` removes the config and deletes the channel
- [ ] `/time availability` allows members to set broad and weekday-specific windows
- [ ] Weekday overrides take precedence over the broad layer
- [ ] Overnight windows (end < start) are correctly interpreted as crossing midnight
- [ ] Channel name includes the stoplight dot when availability is configured
- [ ] `/time info @member` returns an embed with time, date, timezone, availability status, and matching embed color
- [ ] All commands require appropriate permissions (`ManageGuild` for track/untrack; self or admin for availability)
- [ ] `TaskManager` is reusable — registering a new job requires only a name, cron expression, and function
- [ ] `pnpm build` passes with no type errors
- [ ] Changes committed to git following Conventional Commits

---

## Notes

<!-- Populated during execution -->
