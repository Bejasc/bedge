# Events

Mods can post an event card that members RSVP to with buttons. BedgeBot then posts reminders into whichever channels the event is set to use.

## Creating an event

`/event create [channel] [ping_role]` opens a form:

| Field | Notes |
|---|---|
| Title | Required |
| Start time | `YYYY-MM-DD HH:mm`, e.g. `2026-11-01 19:30`, or a Discord timestamp like `<t:1793568600>` pasted from a timestamp generator |
| Timezone | Prefilled with your `/time track` zone if you have one, otherwise the server default. Any IANA name works, e.g. `Australia/Sydney` |
| Description | Optional |
| Image URL | Optional `https` image, shown under the description |

The card shows the title, the start time (in everyone's own timezone, with a countdown), the host, the description, the image, and the RSVP lists. `ping_role` is pinged in reminders, not on the card.

## RSVP

Anyone can press **Going**, **Maybe** or **Can't**. The card updates straight away. Pressing your current choice again removes your RSVP. Each list shows up to 30 names, then a count of the rest.

## Reminders

New events remind in their own channel 1 hour before the start, and again at the start. `/event manage event` (pick the event from the list) changes that:

| Control | What it does |
|---|---|
| Reminder channels | Up to 5 channels that each reminder is posted to |
| Reminder times | Any mix of 1 week, 1 day, 12h, 6h, 3h, 1h, 30m, 15m, 10m and 5m before, plus at the start |
| Edit details | Reopens the form. A new start time re-arms reminders that haven't fired |
| Send reminder now | Posts a reminder immediately, outside the schedule |
| Cancel event | Greys out the card, disables RSVP and stops reminders. The event isn't deleted |

A reminder is a small card with the time and a link to the event. It pings the event's role and everyone who said **Going**.

> [!NOTE] Reminders after downtime
> Reminders are checked every minute and each one fires once. If the bot was offline when several came due, only the one closest to the start is sent; an "at the start" reminder can still go out up to 15 minutes late.

## Listing events

`/event list` shows the server's upcoming events with links and Going counts.
