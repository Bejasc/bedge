# bedge-bot — Claude Code Instructions

<!-- ============================================================== -->
<!-- PROJECT-SPECIFIC CONFIGURATION                                  -->
<!-- Fill these in for the project. The Standards section below is  -->
<!-- the workspace baseline — don't edit it; extend or override here.-->
<!-- ============================================================== -->

## Project

bedge is a personal integration platform built on a TypeScript pnpm monorepo. It exposes two runtime surfaces — a Discord bot (`apps/bot`, Sapphire.js + discord.js 14) and a webhook relay API (`apps/api`, NestJS) — backed by shared Zod schemas (`packages/types`) and Mongoose models (`packages/database`), all connecting to MongoDB Atlas. The goal is to centralise personal integrations: GitHub events, Todoist tasks, Atlassian updates, and Discord server utilities.

## Layout

```
apps/
  bot/src/
    index.ts            entry point — env load, DB connect, client login
    client.ts           SapphireClient instantiation and intent config
    config.ts           env var validation and export
    lib/
      logger.ts         ILogger stub — swap for custom logger here
      database.ts       local DB helpers (to be replaced by @bedge/database)
    commands/general/
      ping.ts           /ping — latency check
  api/src/
    main.ts             NestJS bootstrap
    app.module.ts       root module
packages/
  types/
    src/
      index.ts          Zod schema + type exports
      schemas/          domain schema files go here
    scripts/
      generate-json-schema.ts  writes .schema.json files for VS Code IntelliSense
  database/
    src/
      index.ts          connection + Mongoose model exports
      connection.ts     connectDatabase / disconnectDatabase
data/
  schemas/              auto-generated JSON Schema files (git-committed)
.vscode/
  settings.json         json.schemas entries for data file IntelliSense
```

## Commands

```bash
pnpm dev                         # watch-mode dev run for bot (tsx)
pnpm build                       # tsc build across all packages (-r)
pnpm start                       # run compiled bot
pnpm generate:schema             # generate JSON schemas from Zod types → data/schemas/
docker compose up                # build and run bot container
pnpm --filter @bedge/types ...   # run a command scoped to the types package
pnpm --filter bot ...            # run a command scoped to the bot
pnpm --filter api ...            # run a command scoped to the api
```

## Code rules

- Zod schemas live in `packages/types/src/schemas/` — infer types via `z.infer<>`; never duplicate types manually
- Run `pnpm generate:schema` after changing any schema that maps to a data file; commit the generated `.schema.json`
- All bot slash commands live under `apps/bot/src/commands/<category>/` — Sapphire auto-loads by directory scan
- Import from `@sapphire/framework` not `@sapphire/logger` directly
- NestJS API uses global interceptor chain in app.module.ts; interceptor order matters (see beyond-orbit reference)
- Never commit `.env` — copy `.env.example` and fill in values locally
- `GuildMembers` and `MessageContent` are privileged Discord intents — enable in the Developer Portal

## Testing

No tests yet. Bot unit tests go in `apps/bot/src/__tests__/`; API tests go in `apps/api/src/__tests__/`. Unit-test command logic and service logic only; integration tests require real MongoDB and Discord sandbox.

## Scope vocabulary

The Conventional Commits scope vocabulary for this project:

- `bot` — Discord bot: client, commands, listeners
- `api` — NestJS API: modules, controllers, webhook handlers
- `db` — database package: models, schemas, connection
- `types` — types package: Zod schemas, inferred types
- `cfg` — configuration and environment handling
- `docker` — Dockerfile, docker-compose, container config
- `ci` — GitHub Actions workflows
- `deps` — dependency updates
- `plan-NNN` — plan-housekeeping commits

## Do NOT

- Do not use `shamefully-hoist=true` in `.npmrc` — fix peer deps properly instead
- Do not register application commands with hardcoded guild IDs in production code
- Do not store secrets in code or commit `.env`
- Do not duplicate type definitions between packages — all shared types belong in `@bedge/types`

---

<!-- ============================================================== -->
<!-- WORKSPACE STANDARDS                                             -->
<!-- These apply across every project that uses this scaffold.       -->
<!-- Don't edit them per project. Extend or override above.          -->
<!-- ============================================================== -->

# Standards

## Version control

### Conventional Commits

All commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The `bejasc/conventional-commits` skill carries the full spec, types list, and edge cases — activate it before composing any commit. Quick reference:

- Format: `<type>(<scope>)[!]: <description>`
- Canonical types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scope: see the project-specific *Scope vocabulary* above
- Breaking change: append `!` before the colon, or include a `BREAKING CHANGE:` footer

### Branching

- One branch per plan: `plan/<NNN>-<descriptor>`, e.g. `plan/001-server-discovery`.
- Branch from the default branch. Merge back when the plan is complete.
- Never force-push the default branch.

### When to commit

- After each *completed phase*, not per deliverable.
- All checks must pass before commit (typecheck, tests, lint — whichever apply to the change).
- Plan-state changes (frontmatter updates, `TODO.md` edits) can land as a separate `docs(plan-NNN):` commit.

### Pull requests

The `bejasc/draft-pr` skill produces title, body, and label recommendations from the branch's commits. Activate it when ready to open a PR. The skill drafts; the user submits.

## Planning

The project uses a plan-driven workflow documented in `.claude/README.md`. Three slash commands cover the lifecycle:

- `/plan` — author or update a plan (interview-driven)
- `/work` — execute a plan phase-by-phase, commit per phase, archive on completion
- `/status` — orient at the start of a session

Plans live in `docs/plans/` with domain subfolders. Completed plans archive to `docs/plans/completed/<domain>/`. `TODO.md` at the repo root indexes Active / Upcoming / Captured / Completed.

Plan numbers are global across the project — sequential, zero-padded, never reused.

## Workspace rules

- **No assumptions.** Read files, search the workspace, check conversation history. Ask only after that.
- **Investigation before escalation.** Glob, grep, read — then ask.
- **Human-readable docs.** Vary sentence length, name actors, stop when the point is made. Run the `bejasc/doc-formatting` skill on documents before delivering.
- **Markdown formatting.** Obsidian-native callouts using the primary palette (`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`). No wikilinks; use `[text](path)`. ATX headers, one H1 per document. Emoji only when carrying semantic weight.
- **Editing care.** Carefully consider blast radius for hard-to-reverse actions. Confirm before destructive operations (force push, reset --hard, deleting branches, etc.).
