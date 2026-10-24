# Setup

This page gets BedgeBot from a fresh clone to running in a server: the environment variables, the Discord Developer Portal settings, and the permissions the bot needs in each server.

## Environment variables

The bot reads `apps/bot/.env` locally. In production, `docker-compose.prod.yml` reads `/etc/bedge-bot/bedge-bot.env`. Copy `apps/bot/.env.example` as a starting point.

| Variable | Required | What it's for |
|---|---|---|
| `DISCORD_TOKEN` | Yes | The bot token from the Developer Portal |
| `DISCORD_APPLICATION_ID` | Yes | The application ID |
| `MONGODB_URI` | Yes | MongoDB connection string. Compose sets it for you |
| `OWNER_ID` | Yes | Your Discord user ID. The owner can do everything in every server |
| `ADMIN_GUILD_ID` | No | The admin server that receives a copy of every log |
| `ADMIN_LOG_CHANNEL_ID` | No | The channel in the admin server for those copies. Mirroring is off while either admin variable is unset |
| `BUILDER_URL` | No | Public base URL of the API: `https://bot.bejasc.dev` in production, `http://localhost:3000` locally. Without it, *Open in builder* hands out bare draft codes |
| `DEFAULT_TIMEZONE` | No | IANA zone for event times when the creator hasn't set one with `/time track`. Defaults to `UTC` |
| `TIME_CHANNEL_CRON` | No | How often timezone clocks update. Defaults to every 15 minutes |
| `LOG_*`, `DISCORD_WEBHOOK_*` | No | The ops logger; see [packages/logger](../../packages/logger/README.md) |

The API (`apps/api`) needs only `MONGODB_URI` and optionally `PORT` (default 3000).

> [!IMPORTANT] OWNER_ID is required
> The bot refuses to start without `OWNER_ID`. It's how the bot knows who may configure every server.

## Developer Portal

1. **Bot → Privileged Gateway Intents.** Turn on **Server Members** and **Message Content**. The other intents BedgeBot uses (voice states, invites, AutoMod execution, message reactions) aren't privileged.
2. **Emojis.** Upload [assets/bedgebot.png](../../assets/bedgebot.png) as an application emoji named exactly `bedgebot`. The bot looks it up by name at startup and puts it in every footer. Until it's there, footers are text only.
3. **Installation.** Invite the bot with the `bot` and `applications.commands` scopes.

Commands register globally, so a new command can take a minute to appear after the first start.

## Permissions in each server

Give the bot a role with these permissions, placed **above** every role it should be able to moderate:

| Permission | Needed for |
|---|---|
| View Channels, Send Messages, Embed Links, Attach Files, Read Message History | Everything |
| View Audit Log | Moderation logs and cases for actions taken outside bedge |
| Manage Server | Working out which invite a new member used |
| Manage Messages | `/purge` |
| Moderate Members, Kick Members, Ban Members | Timeouts, kicks and bans |
| Manage Webhooks | Posting as a persona |

## First run in a server

When the bot joins a server, it posts a notice to the admin server. From there:

1. Run `/config` in the new server. Pick a default log channel, and optionally a channel per log category.
2. Set the **Admin** and **Mod** roles in the *Roles* section. Until an admin role is set, anyone with Discord's Administrator permission counts as an admin.
3. Press *Send test log* to check that routing and the admin mirror work.
4. Turn on whatever else the server wants: welcomes, the starboard, games and points.

See [Configuration and tiers](configuration.md) for what each section does.

## Running the API

`docker compose up` starts the API on port 3000 alongside the bot. The builder page is at `/builder/`. To use it from Discord, the API must be reachable from your browser, and `BUILDER_URL` must point at it.

In production the API runs as its own container on `127.0.0.1:3010`, published at `https://bot.bejasc.dev` through Cloudflare and Apache. [DEPLOY.md](../../DEPLOY.md#embed-builder-at-botbejascdev) has the one-time DNS and Apache steps.
