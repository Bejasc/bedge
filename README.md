# bedge

**bedge** is a personal integration platform. It pulls together the tools and services used day-to-day — GitHub, Todoist, Atlassian, Discord — and gives them a place to communicate with each other on your terms.

Two surfaces are active. A Discord bot manages server utilities: join/leave logs, moderation events, embeds, per-server configuration. A webhook relay API receives events from external services and emits human-readable updates to Discord — the kind you'd share in a team channel, not a stack trace. Both surfaces share a MongoDB persistence layer and a common library of schemas and models inside the same repo.

The project is early. The bot is scaffolded and live. The API is stubbed. Integration work hasn't started yet.

---

## Architecture

TypeScript pnpm monorepo.

```
apps/
  bot/        Discord bot — Sapphire.js + discord.js 14
  api/        Webhook relay — NestJS (scaffold only)
packages/
  types/      Zod v4 schemas and inferred types   (@bedge/types)
  database/   Mongoose models and connection       (@bedge/database)
  logger/     Console, file, and Discord webhook   (@bejasc/logger)
```

`apps/bot` is **ESM** (`"type": "module"`, NodeNext module resolution). `apps/api` and all packages are **CommonJS**. Every package extends `tsconfig.base.json` at the root.

---

## Getting started

**Requires:** Node 20+, pnpm 9+, Docker (for the local MongoDB container).

```bash
cp .env.example apps/bot/.env   # fill in DISCORD_TOKEN, DISCORD_APPLICATION_ID, MONGODB_URI
pnpm install
pnpm dev
```

`pnpm dev` spins up a local MongoDB container via Docker before starting the bot in watch mode, and tears it down on exit. In production, replace `MONGODB_URI` with an Atlas connection string.

> [!IMPORTANT]
> Enable **GuildMembers** and **MessageContent** privileged intents in the Discord Developer Portal before the bot will connect. Without them the client will be refused at login.

---

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local MongoDB + bot in watch mode |
| `pnpm build` | Compile all packages (tsc, recursive) |
| `pnpm start` | Run the compiled bot |
| `pnpm generate:schema` | Generate JSON Schema files from Zod types |
| `docker compose up` | Run the full stack in Docker |
| `pnpm --filter bot ...` | Scope a command to the bot only |
| `pnpm --filter api ...` | Scope a command to the API only |

---

## Logging

The logger lives at `packages/logger` as `@bejasc/logger` — a structured logger with console, file, and Discord webhook targets. The bot wires it in via a Sapphire `ILogger` adapter.

Configuration is driven entirely by environment variables. Copy `.env.example` to see the full set. Defaults: console at `INFO`, file output to `./logs/bedge-bot.log`, Discord webhook disabled.

---

## Schema generation

Zod schemas live in `packages/types/src/schemas/`. After adding or changing a schema, run:

```bash
pnpm generate:schema
```

This writes `.schema.json` files to `data/schemas/` and those files are referenced in `.vscode/settings.json` so VS Code provides IntelliSense on any JSON data files that match. Commit the generated output alongside the schema change.

---

## Roadmap

Near-term work is tracked in [TODO.md](TODO.md). The broad shape:

- **Bot** — join/leave and moderation logs, per-guild channel config, `/post-embed`, warn system
- **API** — GitHub PR and push announcements, Todoist task events, Atlassian issue updates
- **Platform** — shared guild config schema, `@bedge/database` model library, multi-surface routing config stored in MongoDB
