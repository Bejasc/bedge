# Deploying bedge-bot

## Overview

bedge-bot deploys to the shared VPS as two Docker containers managed by Docker Compose:

- **bot** — the Discord bot, built from this repo's `Dockerfile` and published to GHCR
- **mongo** — MongoDB 7, official image, data persisted in a named Docker volume

The pipeline is fully automated. Merging to `master` triggers CI; a passing CI triggers deploy. No manual SSH is needed to ship code after the one-time setup is complete.

## How the pipeline works

```
push to master
  → CI (install → build → test)
    → Deploy (build image → push to GHCR → SSH → compose pull → up -d → health check)
      → Discord notification
```

The deploy workflow (`deploy.yml`) is triggered by `workflow_run` — it only fires when CI on `master` completes successfully. A failing test blocks the deploy automatically.

## Architecture

```
GitHub Actions
  ↓ pushes image
ghcr.io/bejasc/bedge-bot:<sha> + :latest

VPS /opt/bedge-bot/
  └── docker-compose.yml      (copied from docker-compose.prod.yml each deploy)

Two containers on the bedge Docker network:
  ├── bot    ← your code, from GHCR
  └── mongo  ← mongo:7, data in named volume mongo-data

/etc/bedge-bot/bedge-bot.env  ← secrets (never in git, never in image)
```

## GitHub secrets required

These are set per-repository under Settings → Secrets → Actions.

| Secret | Value | Notes |
|---|---|---|
| `VPS_HOST` | VPS IP or hostname | Shared with other projects — may already exist |
| `VPS_SSH_KEY` | Private SSH key for the `deploy` user | Shared with other projects — may already exist |
| `DISCORD_WEBHOOK_DEPLOYS` | Webhook URL for build and deploy notifications | Shared — see infra logging-and-notifications standard |

## Environment file

The file `/etc/bedge-bot/bedge-bot.env` on the VPS must contain real values for all keys in `apps/bot/.env.example`. At minimum:

```
DISCORD_TOKEN=...
DISCORD_APPLICATION_ID=...

# Must use the Docker network service name, not localhost
MONGODB_URI=mongodb://mongo:27017/bedge

LOG_CONSOLE_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/bedge-bot.log
```

> [!IMPORTANT]
> `MONGODB_URI` must be `mongodb://mongo:27017/bedge` — `mongo` is the Docker Compose service name and resolves on the internal network. `localhost` will not work inside the bot container.

## GHCR package visibility

The image is published to `ghcr.io/bejasc/bedge-bot`. After the first successful CI run, open the package settings on GitHub (your profile → Packages → bedge-bot → Package settings) and set visibility to **Public**.

A public package means the VPS can pull without authentication — no token or registry login step needed on the server.

If the package must stay private, add a Personal Access Token (PAT) with `read:packages` scope as a `GHCR_PAT` repository secret, then prepend this to the `Pull and restart` step in `deploy.yml`:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u bejasc --password-stdin
```

## One-time server setup

See [`vps/plans/bedge-bot-docker-preflight.md`](../infra/vps/plans/bedge-bot-docker-preflight.md) in the infra repo for the complete numbered checklist. Short version:

1. Install Docker on the VPS and add `deploy` to the `docker` group
2. Create `/opt/bedge-bot/` owned by `deploy`
3. Create `/etc/bedge-bot/bedge-bot.env` with correct values (mode `640`, owner `root:deploy`)
4. Add the three GitHub secrets above
5. Make the GHCR package public after first push

## Rollback

To roll back to a specific version, edit the image tag in `/opt/bedge-bot/docker-compose.yml` on the server:

```bash
ssh deploy@<host>
cd /opt/bedge-bot
# Change image line: ghcr.io/bejasc/bedge-bot:latest → ghcr.io/bejasc/bedge-bot:<sha>
vi docker-compose.yml
docker compose pull
docker compose up -d
```

Previous image SHAs are visible in the GitHub Packages page for this repo.

To restart without changing the image (e.g. after a crash):

```bash
docker compose restart bot
```

## Troubleshooting

```bash
# Stream logs from the bot
docker compose -f /opt/bedge-bot/docker-compose.yml logs bot -f

# Check container status
docker compose -f /opt/bedge-bot/docker-compose.yml ps

# Restart the bot container only (Mongo is left alone)
docker compose -f /opt/bedge-bot/docker-compose.yml restart bot

# Full restart — brings everything down and back up
docker compose -f /opt/bedge-bot/docker-compose.yml down
docker compose -f /opt/bedge-bot/docker-compose.yml up -d

# Open a shell inside the running bot container
docker compose -f /opt/bedge-bot/docker-compose.yml exec bot sh

# Inspect the Mongo volume (confirm data is persisting)
docker volume inspect bedge-bot_mongo-data
```
