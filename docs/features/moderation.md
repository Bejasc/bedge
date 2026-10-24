# Moderation and cases

Every moderation action in a server becomes a numbered **case**, whether it was taken through bedge or not. Cases stay inside their own server. Their logs are mirrored to the admin server like everything else.

## Actions

| Command | Tier | What it does |
|---|---|---|
| `/note user reason` | Mod | Adds a private note to the member's history. No DM, and the reply is visible only to you |
| `/warn user reason` | Mod | Warns and DMs the member |
| `/timeout user duration reason` | Mod | Times the member out for e.g. `10m`, `2h` or `7d`, up to 28 days |
| `/untimeout user reason` | Mod | Ends a timeout early |
| `/kick user reason` | Admin | DMs, then kicks |
| `/ban user reason [delete_messages]` | Admin | DMs, then bans, optionally deleting the last hour, day or week of their messages. Works for users who aren't in the server |
| `/unban user reason` | Admin | Lifts a ban |

Warns, timeouts, kicks and bans confirm publicly in the channel with the case number. A DM that can't be delivered (closed DMs) is mentioned in the reply. The reason also goes into Discord's audit log, prefixed with the moderator's name.

### Who can act on whom

Nobody can act on themselves, the bot or the owner. Mods and admins can't act on anyone with the same or a higher tier, so a mod can't warn an admin. The owner can act on anyone. Discord's own rule applies too: the bot's role must sit above the member's highest role.

## Cases

Each server numbers its cases from 1, and numbers are never reused. A case records the type, member, moderator, reason, when it happened and, for timeouts, when it ends.

| Command | Tier | What it does |
|---|---|---|
| `/case view number` | Mod | Shows a case and links to its log |
| `/case reason number reason` | Mod | Changes a case's reason and logs the change |
| `/case delete number` | Admin | Deletes a case and logs it |

> [!NOTE] Actions taken outside bedge
> A kick, ban or timeout from Discord's own menus, or from another bot, still opens a case, naming whoever did it. bedge reads the audit log to do this, and skips its own actions so nothing is recorded twice.

## Lookup

`/lookup user`, or right-click a member and pick *Apps → Lookup*, shows a member card: avatar, account age, join date, roles and timeout state. Below that are their case counts by type, the ten most recent cases in this server, and buttons to note, warn, time out, kick or ban, filtered to what your tier allows.

## Acting from a log

Member, message, AutoMod and case logs carry three buttons:

- **Lookup** opens the lookup card.
- **Note** opens a note form.
- **Moderate…** opens a panel of Warn, Timeout, Kick and Ban buttons. Each asks for a reason, and a duration for timeouts.

The same three actions are on the member right-click menu: *Add note*, *Lookup* and *Moderate…*.

These buttons also work on the admin server's copy of a log. They act on the server the log came from, and check your tier there, so in practice the owner moderates any server from the admin channel.

## Purge

`/purge amount` (Mod) bulk-deletes up to 100 recent messages in the current channel. Optional filters narrow it: `user`, `contains` (text), `bots`, `attachments` and `links`. Pinned messages and anything older than 14 days are left alone, because Discord won't bulk-delete them. Each purge posts one moderation log with the count and the filters used.
