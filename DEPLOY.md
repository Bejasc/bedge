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

Three containers on the bedge Docker network:
  ├── bot    ← the Discord bot, from GHCR
  ├── api    ← the embed builder and draft API (same image), on 127.0.0.1:3010
  └── mongo  ← mongo:7, data in named volume mongo-data

Cloudflare (HTTPS) → Apache :80 (bot.bejasc.dev) → 127.0.0.1:3010 → api

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
OWNER_ID=...

# Must use the Docker network service name, not localhost
MONGODB_URI=mongodb://mongo:27017/bedge

# Admin hub (optional) and the public builder address
ADMIN_GUILD_ID=...
ADMIN_LOG_CHANNEL_ID=...
BUILDER_URL=https://bot.bejasc.dev
DEFAULT_TIMEZONE=Australia/Sydney

LOG_CONSOLE_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/bedge-bot.log
```

The `api` container doesn't read this file; its two settings are in `docker-compose.prod.yml`. [docs/features/setup.md](docs/features/setup.md) describes every variable.

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
6. Publish the embed builder at `bot.bejasc.dev` (next section)

## Embed builder at bot.bejasc.dev

The `api` container listens only on `127.0.0.1:3010`. Apache gives it a public name, the same way `prototype.bejasc.dev` reaches the auth-gateway: Cloudflare terminates HTTPS and connects to Apache over HTTP on port 80.

1. **Cloudflare DNS:** add an `A` record for `bot` pointing at the VPS IP, **proxied** (orange cloud).
2. **Apache vhost:** create `/etc/apache2/sites-available/bedge-bot.conf`:

   ```apache
   <VirtualHost *:80>
       ServerName bot.bejasc.dev

       # Cloudflare terminates TLS and proxies to the origin over HTTP.

       ErrorLog ${APACHE_LOG_DIR}/bedge-bot-error.log
       CustomLog ${APACHE_LOG_DIR}/bedge-bot-access.log combined

       ProxyRequests Off
       ProxyPreserveHost On
       ProxyPass        / http://127.0.0.1:3010/
       ProxyPassReverse / http://127.0.0.1:3010/

       RequestHeader set X-Forwarded-Proto "https"
   </VirtualHost>
   ```

3. **Enable it:**

   ```bash
   sudo a2enmod proxy proxy_http headers   # already on if prototype.bejasc.dev works
   sudo a2ensite bedge-bot
   sudo apachectl configtest
   sudo systemctl reload apache2
   ```

4. **Check it:** `curl -I http://127.0.0.1:3010/builder/` on the VPS should return `200`, and <https://bot.bejasc.dev/builder/> should load the builder in a browser.
5. Set `BUILDER_URL=https://bot.bejasc.dev` in `/etc/bedge-bot/bedge-bot.env` and restart the bot (`docker compose up -d bot` in `/opt/bedge-bot`).

> [!NOTE] The builder is public
> Anyone can open the page and save drafts. The API rate-limits draft saves to 30 a minute per visitor, using Cloudflare's `CF-Connecting-IP` header, since every request reaches it from Apache on localhost. Drafts expire after 7 days.

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
