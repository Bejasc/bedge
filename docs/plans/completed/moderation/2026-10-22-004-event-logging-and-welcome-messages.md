---
plan: 004
title: Event Logging and Welcome Messages
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: [003]
---

# Plan 004 — Event Logging and Welcome Messages

**Depends on:** Plan 003 — guild config, tiers, and the log renderer and router
**Feeds into:** Plan 005 (cases build on the audit-log listener and the moderation log family) and every later plan that posts logs
**Outcome:** Everything Dyno logged in Ben's servers now logs through bedge, in the Components V2 look, locally and mirrored to the admin server, and new members get a configurable welcome post.

This is the plan where bedge starts doing Dyno's day job. Plan 003 built the pipe; this one connects the gateway events to it. Ben also asked mid-run for welcome messages, which sit naturally beside the join log, so they ride here too.

## Context

Plan 003 left a router that takes `log(guild, typeKey, payload)` and handles channel resolution, category toggles and the admin mirror. Each event family here is a listener plus a set of registered log types, and nothing else.

Edit and delete history comes from discord.js's message cache (Plan 003 Decisions Log), so a message sent before a restart logs without its old content. Kicks, bans and timeouts are read from the audit log rather than inferred from member events, because the audit log is the only place that names who did it and why, and it catches manual and other-bot actions too.

Purge is the one command in this plan. It's mod-tier per Plan 003's capability table.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Mod-action source | `guildAuditLogEntryCreate` for kick, ban, unban, timeout and timeout removal | Catches manual and other-bot actions with executor and reason. Requires *View Audit Log* (settled) |
| Edit/delete history | discord.js cached old/new messages, no store | Settled in Plan 003 |
| Bot-authored messages | Edits and deletes of bot messages are not logged | Dyno's default; bot churn (including bedge's own) would flood the log (assumed overnight) |
| Uncached deletes | Logged with "content not cached" and whatever IDs are known | Still useful to know something was deleted, and where (assumed overnight) |
| Bulk deletes | One `message.bulk_delete` log with the count and a short excerpt of cached messages. Deletes caused by `/purge` are suppressed in favour of the purge's own moderation log | One log per action, not two (assumed overnight) |
| Invite tracking | Cache invite uses per guild on ready and on invite create/delete; on join, diff uses to find the invite. Vanity URL as a fallback. Needs *Manage Server*; without it the join log just says "unknown" | The only way Discord exposes which invite was used (assumed overnight) |
| AutoMod forwarding | Log one `automod.action` per triggering message, deduplicated across the rule's multiple actions over a 10-second window | A single AutoMod hit fires one event per action (block, alert, timeout) (assumed overnight) |
| Member update logs | Nickname and role changes come from `guildMemberUpdate` diffs; timeouts are left to the audit-log path | Avoids double-logging timeouts (assumed overnight) |
| Welcome messages | Per-guild `welcome { enabled, channelId, message }`, configured from a new *Welcome* section of `/config` (channel picker, toggle, *Edit message* modal, *Send preview*). Placeholders: `{user}`, `{username}`, `{server}`, `{memberCount}`. Rendered as a Components V2 card with the member's avatar | Ben asked for welcomes mid-run; reusing the panel keeps config in one place (assumed overnight) |
| "Log them as mod action" | Read as: the join log links to the welcome post, and welcome config changes are logged as `server.config` changes. The welcome post itself isn't a separate log | Most literal reading that doesn't duplicate the join log; flagged for review (assumed overnight) |
| `/purge` filters | `amount` (1–100, required), `user`, `contains`, `bots`, `attachments`, `links`. Messages older than 14 days are skipped, as Discord requires | Covers Dyno's common purge variants in one command (assumed overnight) |
| Context menus | None in this plan. Budget across the roadmap: user — *Add note*, *Lookup*, *Moderate…* (Plan 005); message — *Edit bot message*, *Save as template* (Plan 006), *Open in builder* (Plan 007) | Keeps two user and two message slots spare (assumed overnight) |
| New intents | `GuildVoiceStates`, `GuildInvites`, `AutoModerationExecution` | Needed for voice, invites and AutoMod; none are privileged (assumed overnight) |

## Open Questions

None — all resolved.

## Phase 1 — Message logs

- [x] Log types: `message.edit`, `message.delete`, `message.bulk_delete` (category `messages`)
- [x] `messageUpdate` listener: skips bots, DMs and edits where content didn't change; shows before/after (old marked unavailable when uncached) with a *Jump to message* link
- [x] `messageDelete` listener: author, channel, content and attachment names when cached
- [x] `messageDeleteBulk` listener with purge suppression
- [x] Pure helpers for "did the content change" and the before/after body, with unit tests

**Exit criteria:** Editing and deleting a message produces the right logs; bot messages don't.

## Phase 2 — Member, voice and invite logs

- [x] Log types: `member.join`, `member.leave`, `member.nickname`, `member.roles` (category `members`); `voice.join`, `voice.leave`, `voice.move` (category `voice`); `invite.create`, `invite.delete` (category `server`)
- [x] Join log: account age (flag accounts under 7 days), member count, invite used and inviter
- [x] Leave log: roles held and time in server
- [x] `guildMemberUpdate` diff for nickname and role changes
- [x] `voiceStateUpdate` classifier for join, leave and move
- [x] Invite tracker: cache, create/delete listeners, used-invite detection
- [x] Unit tests: member diff, voice classifier, used-invite detection, account-age formatting

**Exit criteria:** Joins, leaves, nickname/role changes, voice moves and invites all log to their categories.

## Phase 3 — Moderation logs and AutoMod

- [x] Log types: `mod.kick`, `mod.ban`, `mod.unban`, `mod.timeout`, `mod.untimeout`, `mod.purge`, `automod.action` (category `moderation`)
- [x] Pure audit-entry classifier: action type and changes → log type, with tests
- [x] `guildAuditLogEntryCreate` listener posting executor, target, reason and timeout end
- [x] `autoModerationActionExecution` listener with deduplication
- [x] `/purge` (ModTier) with filters, a pure filter function with tests, and a `mod.purge` log

**Exit criteria:** A manual kick, ban, timeout and an AutoMod hit each produce exactly one log with the executor; `/purge` deletes what its filters select.

## Phase 4 — Welcome messages

- [x] `welcome` block in the `GuildConfig` schema and model; schema regenerated
- [x] *Welcome* section in `/config`: channel picker, toggle, *Edit message* (modal), *Send preview*
- [x] Pure placeholder renderer with tests
- [x] On join, post the welcome card when enabled and link it from the join log

**Exit criteria:** A configured server welcomes a new member in the chosen channel with the configured text.

## Out of Scope

- Cases, notes, warns and bot-issued kicks/bans/timeouts (Plan 005)
- A persistent message store for edit/delete history
- Logging channel, role and emoji create/update/delete
- Leave messages and DM welcomes
- Ignored-channel lists for message logs

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including the new pure-logic tests
- [ ] Each log family appears in its configured category channel with the drpg-logger look, and mirrored to the admin server (live check)
- [ ] A manual kick, ban, unban and timeout from Discord's UI each log once, naming the moderator and reason (live check)
- [ ] `/purge amount:20 user:@x` removes only that user's recent messages and posts one moderation log (live check)
- [ ] A new member is welcomed with the configured message, and the join log links to it (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Live-check acceptance items stay unticked here and are covered by the combined guide in `docs/acceptance/`.
- New intents: `GuildVoiceStates`, `GuildInvites`, `AutoModerationExecution` (none privileged). The bot needs *View Audit Log* for mod logs and *Manage Server* for invite tracking.
- Welcome messages were requested mid-run and added as Phase 4.
