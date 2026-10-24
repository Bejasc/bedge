# bedge

**bedge** is a self-hosted Discord bot (BedgeBot) and companion web service that replaces Dyno across a handful of community servers, then adds the things Dyno never did well. One owner runs it; each server gets its own config, its own mod team and its own logs, and everything is mirrored to a central admin server so nothing happens out of sight.

It's built for the servers it runs in, not as a public bot. If you're here to use it in your own server, the [setup guide](docs/features/setup.md) covers what you need.

## What it does

| Area | In short | Guide |
|---|---|---|
| Configuration | One `/config` panel per server: log channels, mod and admin roles, welcomes, starboard, games. Three permission tiers: owner, admin, mod | [Configuration and tiers](docs/features/configuration.md) |
| Logging | Message edits and deletes, joins and leaves, roles and nicknames, voice, invites, moderation from the audit log, AutoMod. Every log is mirrored to the admin server | [Logging and welcomes](docs/features/logging.md) |
| Moderation | Notes, warns, timeouts, kicks and bans as numbered cases, `/lookup`, `/purge`, and action buttons right on the logs | [Moderation and cases](docs/features/moderation.md) |
| Posting | Post as the bot or a webhook persona, edit bot messages in place, saved templates, and a browser-based embed builder | [Posting and the embed builder](docs/features/posting.md) |
| Events | Event cards with RSVP buttons and reminders posted to chosen channels | [Events](docs/features/events.md) |
| Starboard | Messages that collect enough stars are reposted to a highlights channel | [Starboard](docs/features/starboard.md) |
| Games | Coin flip, high/low, dice, blackjack, slots and trivia, with per-game stats, opt-in points, daily rep and leaderboards | [Games and leaderboards](docs/features/games.md) |
| Timezones | Voice-channel clocks for tracked members and an availability stoplight | [Commands](docs/features/commands.md#time-and-availability) |

Every slash command and context menu, with the tier it needs, is listed in the [command reference](docs/features/commands.md). In Discord, `/help` shows the same list, filtered to what you can use.

All bot output uses Discord's Components V2 layout, styled after [drpg-logger](https://github.com/Bejasc/drpg-logger): an accent colour per kind of message, the subject's avatar, and a `BedgeBot` footer.

## Architecture

A TypeScript pnpm monorepo with two apps and three shared packages, all on MongoDB.

```
apps/
  bot/        Discord bot: Sapphire + discord.js 14 (Components V2)
  api/        NestJS: the embed builder page and draft API
packages/
  types/      Zod schemas and inferred types       (@bedge/types)
  database/   Mongoose models and connection        (@bedge/database)
  logger/     Console, file and Discord-webhook logger (@bejasc/logger)
```

Everything is ESM (`"type": "module"`, NodeNext resolution) and extends `tsconfig.base.json`.

## Running it

You need Node 20+, pnpm 9 or 10, and Docker for the local MongoDB container.

```bash
cp apps/bot/.env.example apps/bot/.env   # fill in the Discord token, application ID and OWNER_ID
pnpm install
pnpm dev                                 # local MongoDB + the bot in watch mode
```

`docker compose up` runs the bot, the API (on port 3000) and MongoDB together. The [setup guide](docs/features/setup.md) lists every environment variable, the Developer Portal settings and the permissions the bot needs.

> [!IMPORTANT] Privileged intents
> Enable **Server Members** and **Message Content** for the application in the Discord Developer Portal. Without them Discord refuses the bot's login.

## Development

| Command | What it does |
|---|---|
| `pnpm dev` | Local MongoDB and the bot in watch mode |
| `pnpm build` | Compile every package |
| `pnpm test` | Run the bot and API test suites (Vitest) |
| `pnpm start` | Run the compiled bot |
| `pnpm --filter api start` | Run the compiled API |
| `pnpm generate:schema` | Regenerate JSON Schemas from the Zod types into `data/schemas/` |

Tests live in `apps/<app>/tests/` and cover pure logic only; anything that needs Discord or MongoDB is checked by hand, guided by the acceptance guides in [docs/acceptance/](docs/acceptance/).

Work is plan-driven: plans live in [docs/plans/](docs/plans/), indexed by [TODO.md](TODO.md).

## Docs

- [Setup](docs/features/setup.md): environment, Developer Portal and permissions
- [Configuration and tiers](docs/features/configuration.md)
- [Logging and welcomes](docs/features/logging.md)
- [Moderation and cases](docs/features/moderation.md)
- [Posting and the embed builder](docs/features/posting.md)
- [Events](docs/features/events.md)
- [Starboard](docs/features/starboard.md)
- [Games and leaderboards](docs/features/games.md)
- [Command reference](docs/features/commands.md)
