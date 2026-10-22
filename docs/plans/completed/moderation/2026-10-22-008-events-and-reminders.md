---
plan: 008
title: Events and Reminders
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: moderation
depends: [001, 003]
---

# Plan 008 — Events and Reminders

**Depends on:** Plan 001 (its `TaskManager` runs the reminder job) and Plan 003 (tiers, the Components V2 style and the log router)
**Feeds into:** Nothing downstream; it is the last plan in the Dyno-replacement roadmap
**Outcome:** Mods can post an event card with a title, image, time and description, members RSVP with buttons, and bedge posts reminders into whichever channels the event is set to use.

Ben's communities run game nights and ops on a schedule, and Dyno-era tooling for that was a mix of bots. This gives bedge one event card that keeps its own RSVP list and reminds people on time.

## Context

Plan 001 built a `TaskManager` around `node-cron`. Reminders run as one minute-by-minute job that reads due reminders from MongoDB, so they survive restarts and a missed tick is caught on the next one.

Times are typed by people in many timezones. The bot already tracks member timezones for `/time` (Plan 001), so an event's time is read in the creator's tracked zone when there is one.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Who can create and manage events | Mod tier; anyone can RSVP | Events are routine community work, not admin-level config (assumed overnight) |
| Creation flow | `/event create [channel] [ping_role]` opens a modal: Title, Start time, Timezone, Description, Image URL | A modal fits all five; the channel and role pickers live on the slash command (assumed overnight) |
| Time input | `YYYY-MM-DD HH:mm` in the given timezone, or a Discord timestamp (`<t:…>`) or a raw Unix time. The timezone field is prefilled with the creator's `/time` zone, else `DEFAULT_TIMEZONE`, else UTC | Unambiguous and copy-pasteable; reusing tracked zones saves typing (assumed overnight) |
| Image | A URL, shown as a media gallery in the card | Discord attachment URLs expire (assumed overnight) |
| Event card | Components V2 container: title, `<t:…:F>` and relative time, description, image, host, RSVP lists (Going / Maybe / Can't, with counts), and three RSVP buttons | Matches the Plan 003 look; RSVP state is visible at a glance (assumed overnight) |
| RSVP storage | On the event document, one status per user; clicking the same status again removes it | Simple, and toggling off is what people expect (assumed overnight) |
| Reminder config | `/event manage` panel per event: a multi channel select (up to 5 reminder channels) and a multi select of offsets (1 week, 1 day, 12h, 6h, 3h, 1h, 30m, 15m, 10m, 5m, at start). Defaults: the event's channel, 1 hour before and at start | Settled: reminders into chosen channels. Pickers mean no typing (assumed overnight) |
| Reminder content | A small card with the time, a jump link to the event, the ping role if set, and mentions of members who said Going | The people who said they'd come are the ones who need the nudge (assumed overnight) |
| Reminder scheduling | One `event-reminders` TaskManager job every minute. A reminder is sent once; if the bot was down, a reminder still fires late as long as the event hasn't started (or within 15 minutes of start for the "at start" one), otherwise it's skipped | Restart-safe without a job per reminder (assumed overnight) |
| Editing the start time | Saving a new start time clears the sent-reminder list so reminders re-arm for the new time | Moving an event shouldn't silently drop its reminders (assumed overnight) |
| Event numbering | Per-server sequence, like cases | Short references in `/event manage` and logs (assumed overnight) |
| Cancelling | *Cancel event* in the manage panel greys the card, disables RSVP and stops reminders; the event is kept | Members see it was cancelled rather than it vanishing (assumed overnight) |
| Logs | `event.create`, `event.update`, `event.cancel` in the `server` category | Consistent with the other admin actions (assumed overnight) |
| Context menus | None | Budget stays user 3/5, message 3/5 |

## Open Questions

None — all resolved.

## Phase 1 — Model and pure logic

- [x] `Event` Zod schema and model (guild, number, channel and message IDs, title, description, image, start, timezone, host, ping role, reminder channels and offsets, sent offsets, RSVPs, cancelled)
- [x] Pure helpers with tests: time parsing, RSVP toggling and grouping, due/skip reminder calculation, offset labels
- [x] `DEFAULT_TIMEZONE` env var

**Exit criteria:** Time parsing and reminder timing behave correctly under test, including late and missed reminders.

## Phase 2 — Event card and RSVP

- [x] Card renderer (live, cancelled) with RSVP lists and buttons
- [x] `/event create` command and modal; post the card; `event.create` log
- [x] RSVP button handler that updates the card in place
- [x] `/event list` of upcoming events

**Exit criteria:** A posted event takes RSVPs and the card updates live.

## Phase 3 — Management and reminders

- [x] `/event manage` panel: reminder channels, reminder times, *Edit details* (modal), *Send reminder now*, *Cancel event*
- [x] Reminder card and sender
- [x] `event-reminders` job registered with the TaskManager at startup

**Exit criteria:** Reminders arrive in every chosen channel at each chosen offset, once.

## Out of Scope

- Recurring events
- Discord's native Scheduled Events
- Waitlists or RSVP caps
- Scheduled posts in general (settled: out)

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including time-parsing and reminder-timing tests
- [ ] `/event create` posts a card with title, image, time and description (live check)
- [ ] RSVP buttons update the card, and clicking again removes the RSVP (live check)
- [ ] Reminders post in each configured channel at the chosen offsets and mention people who are going (live check)
- [ ] Cancelling an event greys the card and stops reminders (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built overnight. Live-check acceptance items stay unticked here and are covered by the combined guide in `docs/acceptance/`.
- The reminder job does nothing until the client is ready, because reminders are marked sent before posting (to avoid duplicates after a crash).
- *Send reminder now* is a manual extra; it doesn't count against the scheduled offsets.
- New env var: `DEFAULT_TIMEZONE` (defaults to UTC).
