# Command reference

Every slash command and right-click (*Apps*) action BedgeBot offers, with the tier it needs. Tiers are explained in [Configuration and tiers](configuration.md#permission-tiers). In Discord, `/help` shows this list filtered to what you can use.

## General

| Command | Tier | What it does |
|---|---|---|
| `/help` | Everyone | Lists the commands you can use here |
| `/ping` | Everyone | Shows the bot's latency |

## Configuration

| Command | Tier | What it does |
|---|---|---|
| `/config` | Admin | Opens the server config panel: logging, roles, welcome, starboard, games |

## Moderation

See [Moderation and cases](moderation.md).

| Command | Tier | What it does |
|---|---|---|
| `/note user reason` | Mod | Adds a private note as a case |
| `/warn user reason` | Mod | Warns and DMs a member |
| `/timeout user duration reason` | Mod | Times a member out, up to 28 days |
| `/untimeout user reason` | Mod | Ends a timeout |
| `/kick user reason` | Admin | Kicks a member |
| `/ban user reason [delete_messages]` | Admin | Bans a user |
| `/unban user reason` | Admin | Lifts a ban |
| `/case view·reason·delete number` | Mod (delete: Admin) | Shows, edits or deletes a case |
| `/lookup user` | Mod | Member card with history and actions |
| `/purge amount [user] [contains] [bots] [attachments] [links]` | Mod | Bulk-deletes recent messages |
| *Add note* (member menu) | Mod | Note form |
| *Lookup* (member menu) | Mod | Member card |
| *Moderate…* (member menu) | Mod | Warn / Timeout / Kick / Ban panel |

## Posting

See [Posting and the embed builder](posting.md).

| Command | Tier | What it does |
|---|---|---|
| `/post [template] [code] [channel] [persona]` | Admin | Posts as the bot or a persona. With `code`, posts a builder draft |
| `/persona add·remove·list` | Admin | Manages webhook personas |
| `/template save·list·delete` | Admin | Manages saved templates |
| *Edit bot message* (message menu) | Admin | Edits a BedgeBot or persona post in place |
| *Save as template* (message menu) | Admin | Saves a message as a template |
| *Open in builder* (message menu) | Admin | Opens a message in the embed builder |

## Events

See [Events](events.md).

| Command | Tier | What it does |
|---|---|---|
| `/event create [channel] [ping_role]` | Mod | Posts an event card |
| `/event manage event` | Mod | Reminder channels and times, edit, send now, cancel |
| `/event list` | Mod | Upcoming events |

## Games

See [Games and leaderboards](games.md).

| Command | Tier | What it does |
|---|---|---|
| `/coinflip [call]` | Everyone | Flips a coin; with a call, plays for a streak |
| `/highlow` | Everyone | High/low card game |
| `/roll [dice]` | Everyone | Rolls dice like `2d6+1` |
| `/dice bot [sides]` | Everyone | Roll against the bot |
| `/dice duel opponent [sides]` | Everyone | Challenge a member |
| `/blackjack` | Everyone | A hand of blackjack against the dealer |
| `/slots` | Everyone | Spin the slot machine |
| `/trivia [category] [difficulty]` | Everyone | Ask the channel a trivia question |
| `/rep user` | Everyone | Gives a point of rep, once a day (points must be on) |
| *Give rep* (member menu) | Everyone | Same as `/rep` |
| `/leaderboard board` | Everyone | Top 10 for points, rep or a game |
| `/stats [user]` | Everyone | Points, rep and game stats |

## Time and availability

These predate the tier system and check Discord's *Manage Server* permission directly where noted.

| Command | Who | What it does |
|---|---|---|
| `/time track member zone category alias` | Manage Server | Adds a voice-channel clock showing a member's local time |
| `/time untrack member` | Manage Server | Removes a member's clock |
| `/time info member` | Everyone | Shows a tracked member's time and availability |
| `/availability view·set·advanced·reset·override` | Everyone (for others: Manage Server) | Views or sets the availability stoplight shown on a member's clock |
