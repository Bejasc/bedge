---
plan: 005
title: Moderation and Cases
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: [003, 004]
---

# Plan 005 — Moderation and Cases

**Depends on:** Plan 003 (tiers, router) and Plan 004 (audit-log listener, moderation log family)
**Feeds into:** Nothing downstream in the roadmap; it completes the moderation half of the Dyno replacement
**Outcome:** Mods and admins can note, warn, time out, kick and ban from slash commands, context menus or buttons on any log, every action becomes a numbered case, and *Lookup* shows a member's history in one place.

Plan 004 made bedge see moderation happen. This plan lets people do moderation through it, and gives every action a durable, numbered record that stays inside its own server.

## Context

Plan 003 fixed the capability split: mods get notes, warns, timeouts, purge and lookup; admins add kick and ban. Plan 003's Context also fixed visibility: notes and cases are visible only in their own server, but their logs mirror to the admin server like everything else.

Plan 004's audit-log listener already logs kicks, bans and timeouts no matter who did them. Here it also opens a case for each one, so a ban made from Discord's own UI is still a numbered case. Actions bedge performs itself create their case directly and tell the audit listener to stand down, so nothing is recorded twice.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Case scope | One `ModCase` collection; numbers are per server and never reused. Types: `note`, `warn`, `timeout`, `untimeout`, `kick`, `ban`, `unban` | Notes and actions share one history and one numbering, like Dyno (assumed overnight) |
| Case visibility | `/case`, `/lookup` and the *Lookup* button only read cases for the server the interaction belongs to. The owner can act from the admin mirror, scoped to the source server | Settled: cases stay in their own server; the owner is the one cross-server exception (assumed overnight) |
| Bot-issued vs manual actions | bedge's own actions create the case, then register a short-lived "pending" marker; the audit-log listener skips entries that match one. Anything else in the audit log (Discord UI, other bots) opens a case with the executor as moderator | One case per action whoever performs it (assumed overnight) |
| Command surface | `/note`, `/warn`, `/timeout`, `/untimeout` (mod); `/kick`, `/ban`, `/unban` (admin); `/case view·reason·delete` (view and reason mod, delete admin); `/lookup` (mod) | Matches Dyno's top-level verbs; tiers follow Plan 003 (assumed overnight) |
| User context menus | *Add note*, *Lookup*, *Moderate…* — three of the five user slots | Settled scope; leaves two slots spare |
| *Moderate…* flow | An ephemeral panel with Warn / Timeout / Kick / Ban buttons (filtered by tier), each opening a modal for reason (and duration for timeouts) | Two clicks, no typing IDs; modals keep reasons mandatory (assumed overnight) |
| Action buttons on logs | Member, message, AutoMod and case logs carry *Lookup*, *Note* and *Moderate…* buttons whose custom IDs hold the source guild and user, so they work from the admin mirror | Settled scope (forwarded logs need actions) |
| Hierarchy rule | A moderator can't act on themselves, the owner, the bot, or anyone of equal or higher tier; Discord's role hierarchy (`moderatable`, `kickable`, `bannable`) is checked as well | Stops mods warning admins and avoids Discord API errors (assumed overnight) |
| DMs | Warn, timeout, kick and ban DM the member (best effort, before kick/ban) with the server name and reason. Notes never DM | Dyno's behaviour; members should know why (assumed overnight) |
| Durations | `30s`, `10m`, `2h`, `7d` and combinations; timeouts capped at 28 days | Discord's timeout limit (assumed overnight) |
| Ban message deletion | `/ban delete_messages` choice: none, 1 hour, 1 day, 7 days | Discord's options; default none (assumed overnight) |
| Command replies | Warn, timeout, kick and ban confirm publicly in the channel; notes, lookups and errors are ephemeral | A visible confirmation deters, as Dyno's does; notes stay private (assumed overnight) |
| Case numbering | A `counters` collection with an atomic `$inc` per guild | Safe under concurrent actions (assumed overnight) |

## Open Questions

None — all resolved.

## Phase 1 — Case storage

- [x] `ModCase` Zod schema in `packages/types` and `ModCaseModel` (unique on guild + number, indexed on guild + target)
- [x] `CounterModel` with `nextSequence(key)`
- [x] Case service: create, get, list for a target, update reason, delete
- [x] Log types `case.note`, `case.warn`, `case.update`, `case.delete`; existing `mod.*` logs gain a case number field

**Exit criteria:** Cases can be created and read back with sequential per-server numbers.

## Phase 2 — Actions and commands

- [x] Pure helpers with tests: duration parser, target check (self, owner, bot, tier), DM text
- [x] Moderation service performing warn, note, timeout, untimeout, kick, ban, unban: check, DM, act, case, log, pending marker
- [x] Audit-log listener opens cases for non-bedge actions and skips pending ones
- [x] Slash commands as listed in the Decisions Log, each declaring its tier through `tiered()`

**Exit criteria:** Each command performs its action, replies with the case number, and produces exactly one log and one case.

## Phase 3 — Lookup, context menus and log buttons

- [x] *Lookup* panel: member card (avatar, account age, join date, roles, timeout state), case counts by type, the ten most recent cases, and action buttons
- [x] User context menus *Add note*, *Lookup*, *Moderate…*
- [x] *Moderate…* panel and the action modals
- [x] Log action buttons added to member, message, AutoMod and case logs; one handler that resolves the source guild and checks tier there

**Exit criteria:** From a mirrored log in the admin server, the owner can look up and warn a member of the source server.

## Out of Scope

- Automatic punishments (warn thresholds), temp-bans and case expiry
- Appeals, mod-mail and DM-based reporting
- Cross-server case search
- Mute roles (timeouts replace them)

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including duration, target-check and case-format tests
- [ ] `/warn`, `/timeout`, `/kick` and `/ban` each create one numbered case and one log, mirrored to the admin server (live check)
- [ ] A ban from Discord's own UI opens a case naming the moderator (live check)
- [ ] `/lookup` shows the history, and a server's cases don't appear in another server (live check)
- [ ] The three context menus and the log buttons work, including from the admin mirror (live check)
- [ ] A mod can't warn an admin; a mod can't see *Kick*/*Ban* (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Live-check acceptance items stay unticked here and are covered by the combined guide in `docs/acceptance/`.
- The bot needs *Timeout Members*, *Kick Members* and *Ban Members*, with its role above anyone it should act on.
- Context menu budget after this plan: user 3/5, message 0/5.
- `/case` lives in the `moderation` category; `/case delete` checks the admin tier inside the command because the command as a whole is mod-tier.
