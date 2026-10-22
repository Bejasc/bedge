# Logging and welcomes

BedgeBot logs what happens in a server to the channels set in [`/config`](configuration.md#log-categories), and mirrors every log to the admin server. Logs are cards with the subject's avatar, an accent colour per kind of event, links back to the source, and a `BedgeBot` footer.

## What gets logged

| Category | Events |
|---|---|
| Messages | Edits (before and after), deletes (content and attachment names), bulk deletes (count and an excerpt) |
| Members | Joins (account age, member count, invite used), leaves (roles held, time in server), nickname changes, role changes |
| Moderation | Kicks, bans, unbans, timeouts and timeout removals (with moderator and reason), purges, AutoMod hits, notes, warns, case edits |
| Voice | Joining, leaving and moving between voice channels |
| Server | Config changes, invites created and deleted, posts made through the bot, events, test logs |

Member, message, AutoMod and case logs carry **Lookup**, **Note** and **Moderate…** buttons. They work from the admin-server copy too, against the original server. See [Moderation](moderation.md#acting-from-a-log).

### How a few of these work

- **Edits and deletes** use the messages Discord's library has cached since the bot started. A message sent before the last restart still logs, marked *not cached*, without its old content. Edits and deletes of bot messages aren't logged, and link previews loading in don't count as edits.
- **Moderation** logs come from the server's audit log, so they're logged whether the action came from bedge, Discord's own menus or another bot. Each one also opens a [case](moderation.md#cases). The bot needs *View Audit Log* for this.
- **Invite tracking** compares invite use counts before and after a join. It needs *Manage Server*. Without it, the join log says the invite is unknown. Servers with a vanity URL show it as a likely match when nothing else changed.
- **AutoMod** hits log once per message, even when the rule takes several actions.
- **Bulk deletes** caused by `/purge` aren't logged twice. The purge posts its own moderation log instead.

## Welcome messages

The *Welcome* section of `/config` sets a channel and a message to greet new members with a card showing their avatar. *Preview* shows the card to you privately, using your own name.

The message can use these placeholders:

| Placeholder | Becomes |
|---|---|
| `{user}` | A mention of the new member, the only ping the card sends |
| `{username}` | Their username |
| `{server}` | The server's name |
| `{memberCount}` | The member count after they joined |

When a welcome is posted, the join log gets a *Welcome message* button that jumps to it.
