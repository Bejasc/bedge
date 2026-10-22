# Configuration and tiers

Each server has its own config, edited from one panel. There's nothing to type: channels, roles and options are all pickers.

## The `/config` panel

`/config` opens a private panel for admins. A select at the top switches between sections. Every change saves immediately and posts a *Config changed* log.

| Section | What you set |
|---|---|
| Logging | The default log channel, plus a channel and an on/off switch for each log category. *Send test log* checks routing |
| Roles | The **Admin** and **Mod** roles |
| Welcome | Welcome channel, message, on/off and a private preview. See [Logging and welcomes](logging.md#welcome-messages) |
| Starboard | Channel, emoji, threshold and whether self-stars count. See [Starboard](starboard.md) |
| Games | Points and rep on/off, and daily caps on games against the bot. See [Games and leaderboards](games.md) |

### Log categories

Logs fall into five categories: **messages**, **members**, **moderation**, **voice** and **server**. Each category posts to its own channel if one is set, otherwise to the default channel. Turning a category off stops it in this server. The copy still goes to the admin server. [Logging](logging.md) lists what each category contains.

## Permission tiers

BedgeBot has three tiers above an ordinary member.

| Tier | Who | Can |
|---|---|---|
| Owner | The `OWNER_ID` user | Everything, in every server |
| Admin | The server's Admin role | Everything a mod can, plus kick, ban, `/config`, posting, personas and templates |
| Mod | The server's Mod role | Notes, warns, timeouts, purge, lookup, cases and events |

A higher tier always includes the lower ones. Members without a tier can still use `/help`, the games, `/rep`, `/stats`, `/leaderboard`, `/roll`, `/time` and `/availability`, and can RSVP to events.

> [!TIP] A fresh server isn't locked out
> Until an Admin role is set in `/config`, anyone with Discord's **Administrator** permission counts as an admin. Once you set the role, only that role (and the owner) does.

Commands also hide from members who lack a rough Discord permission (Manage Messages for mod commands, Manage Server for admin ones). That's only a first filter in Discord's UI. The tier check runs every time.

## The admin server

If `ADMIN_GUILD_ID` and `ADMIN_LOG_CHANNEL_ID` are set, every log from every server is mirrored to that one channel. Each copy shows the source server's icon and name, with buttons to jump to the original event and to the server's own log. The admin server's own logs aren't mirrored back to itself. BedgeBot also posts a notice there when it joins or leaves a server.

## `/help`

`/help` lists every command and context-menu action you can use in the current server, grouped by category. It's built from the commands themselves, so a new command appears without anyone editing the help.
