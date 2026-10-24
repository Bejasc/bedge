# Dyno Replacement — Acceptance & Review

> **What this is.** A guided review of everything that replaces Dyno in bedge: server config, permission tiers, logging, moderation and cases, the posting toolkit, the embed builder, and events (Plans 003–008). There is one item per thing you can see or do. Work top to bottom; most items take a couple of minutes.
>
> **Scope note.** Everything below was built and unit-tested overnight, but none of it has touched a live Discord server yet. Every interactive item is a first live run. T1 covers the logic the test suite already proves.

---

## How to give feedback (the stoplight)

Set each item's **Verdict** cell in the table below to a dot, and append a short note after it if useful (e.g. `🟡 — footer too faint`). Copy the dot you want from here:

| Dot | Means |
|-----|-------|
| 🟢 | **Good** — works as described |
| 🟡 | **Change** — works, but change it (note what) |
| 🔴 | **Bad** — didn't do what *Expected* says (note what) |
| ⚪ | **Skipped** — didn't check it (note why, optional) |
| ⚫ | **Not done** — default; not reviewed yet |

**Copy-paste palette:**  🟢  🟡  🔴  ⚪  ⚫

> [!TIP]
> Review it in the web viewer (<https://prototype.bejasc.dev/acceptance/>), then hand back **Copy link** or **Export .md** and ask Claude to review your feedback.

## Verdict table

| ID | Item | Scene / Source | Verdict |
|----|------|----------------|---------|
| I1 | `/config` panel sets channels, toggles and roles | Test server | ⚫ |
| I2 | Permission tiers gate commands and buttons | Test server | ⚫ |
| I3 | Log look and admin-server mirror | Test + admin server | ⚫ |
| I4 | Message logs (edit, delete, bulk delete) | Test server | ⚫ |
| I5 | Member logs (join, leave, nickname, roles, invites) | Test server | ⚫ |
| I6 | Voice logs | Test server | ⚫ |
| I7 | Moderation and AutoMod logs from the audit log | Test server | ⚫ |
| I8 | Welcome messages | Test server | ⚫ |
| I9 | `/purge` with filters | Test server | ⚫ |
| I10 | Notes, warns, timeouts, kicks and bans as cases | Test server | ⚫ |
| I11 | `/lookup` and `/case` | Test server | ⚫ |
| I12 | Action buttons on logs and the user context menus | Test + admin server | ⚫ |
| I13 | Post as bot (`/post`) | Test server | ⚫ |
| I14 | Webhook personas | Test server | ⚫ |
| I15 | *Edit bot message* and *Open in builder* | Test server + builder | ⚫ |
| I16 | Saved templates | Test server | ⚫ |
| I17 | Embed builder page | Browser | ⚫ |
| I18 | Events and RSVP | Test server | ⚫ |
| I19 | Event reminders | Test server | ⚫ |
| I20 | `/help` | Test server | ⚫ |
| I21 | Timezone commands still work after the upgrade | Test server | ⚫ |
| T1 | Pure logic behind all of the above | Automated tests | ⚫ |

---

## Setup

You need two servers: a **test server** and the **admin server**, plus a second Discord account (an "alt") to play the member, mod and admin.

1. Do the **Manual setup before testing** checklist in the PR description (env vars, privileged intents, the `bedgebot` application emoji, bot permissions).
2. `pnpm install`, `pnpm build`, then `pnpm dev` for the bot. For the builder, also run the API: `pnpm --filter api build` then `pnpm --filter api start` (it needs `MONGODB_URI`), and set `BUILDER_URL=http://localhost:3000` on the bot.
3. In the test server make three roles — **Mod**, **Admin**, **Member** — and three text channels: `#logs`, `#mod-logs`, `#welcome`. Your alt starts with no tier role.
4. Commands register globally, so allow a minute after the first start for them to appear.

> [!NOTE]
> The footer's bot icon only appears once the `bedgebot` application emoji is uploaded. Without it the footer is text only; that's expected, not a bug.

---

## Interactive checks — configuration and tiers

### I1 — `/config` panel
**Steps:** As yourself, run `/config`. In *Logging*, pick `#logs` as the default channel. Pick the *Moderation* category, set its channel to `#mod-logs`, then disable and re-enable *Voice*. Switch to *Roles* and set the Mod and Admin roles. Switch to *Welcome* (covered in I8). Press *Send test log*.
**Expected:** Everything is done with pickers, no IDs typed. The summary updates after each change, every change posts a "Config changed" log, and the test log lands in `#logs` with a reply telling you where it and its mirror went.
**This includes a feel item** — is the panel easy to understand at a glance?

### I2 — Permission tiers
**Steps:** With the alt holding no tier role, try `/config`, `/warn` and `/post`. Give the alt **Mod**: retry all three. Give it **Admin**: retry. Also click a *Moderate…* button on a log as the Mod alt.
**Expected:** No role: all refused. Mod: `/warn` works, `/config` and `/post` are refused, and the *Moderate…* panel offers Warn and Timeout but not Kick or Ban. Admin: all three work. You (the owner) can do everything everywhere.

---

## Interactive checks — logging

### I3 — Log look and admin mirror
**Steps:** Look at the test log from I1 in `#logs`, and at its copy in the admin server's log channel. Click both Jump buttons on the mirror.
**Expected:** A Components V2 card in the drpg-logger style: emoji title with the subject, avatar thumbnail, accent colour, compact fields, a separator and a `BedgeBot • time` footer. The mirror shows the source server's icon and name; *Jump to source* and *Jump to log* go to the right messages. Disabling a category stops the local copy but the mirror still arrives.
**This is a feel item** — does it look as good as the drpg-logger logs did?

### I4 — Message logs
**Steps:** As the alt, send a message, edit it, then delete it. Paste a link in a new message (it unfurls) and leave it. Delete a few of the alt's messages with Discord's bulk tools or `/purge` (see I9).
**Expected:** One "Message edited" log with before and after, one "Message deleted" log with the content. The link unfurl produces no edit log. Bot messages never produce edit/delete logs.

### I5 — Member logs
**Steps:** Create an invite, have the alt leave and rejoin with it, change the alt's nickname, add and remove a role, then delete the invite.
**Expected:** Logs for invite created, member joined (account age, member count, and the invite code with its creator), nickname changed (before/after), roles changed (added/removed), member left (roles held, time in server), and invite deleted.

### I6 — Voice logs
**Steps:** As the alt, join a voice channel, move to another, then leave.
**Expected:** Three logs in the voice category: joined, moved (from → to) and left. Muting or deafening produces nothing.

### I7 — Moderation and AutoMod logs
**Steps:** Using Discord's own UI (not bedge), time out the alt, remove the timeout, kick it, then ban and unban it. Set up an AutoMod keyword rule and trigger it as the alt.
**Expected:** Each action logs once in `#mod-logs`, naming you as moderator with the reason and, for the timeout, the end time. Each also opens a numbered case (see I11). The AutoMod hit logs once, even if the rule has several actions.

### I8 — Welcome messages
**Steps:** In `/config` → *Welcome*, pick `#welcome`, press *Edit message* and enter `Hey {user}, welcome to **{server}** (member #{memberCount})!`, press *Preview*, then *Enable welcomes*. Have the alt leave and rejoin.
**Expected:** The preview shows only to you. On rejoin, a welcome card with the alt's avatar appears in `#welcome`, pings only the alt, and the join log has a *Welcome message* button that jumps to it.
**This includes a feel item** — overnight, "log them as mod action" was read as "link the welcome from the join log". Say if you meant something else.

### I9 — `/purge`
**Steps:** Have the alt and you each send about five messages, one with a link and one with an attachment. Run `/purge amount:10 user:@alt`, then `/purge amount:5 links:true`.
**Expected:** Only the matching messages go (pinned and older-than-14-day messages are kept). Each purge posts one "Messages purged" log with the count and filters, and no separate bulk-delete log.

---

## Interactive checks — moderation and cases

### I10 — Notes, warns and actions
**Steps:** Run `/note`, `/warn`, `/timeout duration:10m`, `/untimeout`, `/kick`, `/ban` and `/unban` against the alt, each with a reason. As the Mod alt, try to `/warn` the Admin.
**Expected:** Each action replies with its case number. Warn, timeout, kick and ban DM the alt first; notes don't DM and reply privately. Each produces exactly one log with *Lookup*, *Note* and *Moderate…* buttons. Discord's audit log shows the action with your name in the reason. The mod-warns-admin attempt is refused.

### I11 — `/lookup` and `/case`
**Steps:** Run `/lookup user:@alt`. Then `/case view number:1`, `/case reason number:1 reason:updated`, and as Admin `/case delete` on one case. Run `/lookup` for the alt in a second server.
**Expected:** Lookup shows the avatar, account age, join date, roles, timeout state, counts by case type and the ten newest cases, with action buttons. Case view, edit and delete work and log. The second server shows none of the first server's cases.

### I12 — Log buttons and context menus
**Steps:** Right-click the alt → *Apps* and use *Add note*, *Lookup* and *Moderate…*. Then, in the **admin server**, use the *Lookup* and *Note* buttons on a mirrored log.
**Expected:** The three menus work in the test server. From the admin mirror, the buttons act on the source server: Lookup shows the alt's history there, and the note becomes a case in the source server.

---

## Interactive checks — posting

### I13 — Post as bot
**Steps:** Run `/post`. Post once each as *Text*, *Card* and *JSON* (for JSON try `{"embeds":[{"title":"Hi","color":5793266}]}`), choosing a different channel in the picker at least once. Try a JSON payload with both `content` and a V2 container.
**Expected:** One modal with channel, *Post as*, format and content. All three formats post correctly, each with a "Posted as bot" log. The mixed payload is rejected with a clear message that includes your content so you can copy it back.

### I14 — Webhook personas
**Steps:** `/persona add name:Herald avatar_url:<https image>`, `/persona list`, then `/post` as *Herald*. Post as Herald in a thread too.
**Expected:** The post shows the Herald name and avatar. Only one "BedgeBot Personas" webhook exists per channel however often you post.

### I15 — *Edit bot message* and *Open in builder*
**Steps:** Right-click a bot post → *Apps* → *Edit bot message*; change it and save. Do the same on a Herald post. Then right-click a bot post → *Open in builder*, follow the link, change something, *Save draft*, and run `/post code:<new code>` → *Update original*.
**Expected:** Edits apply in place for both bot and persona posts, with a "Bot post edited" log. *Open in builder* replies with a working builder link, and *Update original* changes the original message rather than posting a new one. *Edit bot message* on someone else's message is refused.

### I16 — Templates
**Steps:** Right-click a post → *Save as template*, name it, save. `/template list`, then `/post template:<name>`, change a word and send. `/template delete`.
**Expected:** The template prefills the `/post` modal (format and content) and can be edited before sending. List and delete work, and saves and deletes are logged.

### I17 — Embed builder page
**Steps:** Open `/builder/`. Use the *Text*, *Embed*, *Card (V2)*, *+ Field* and *+ Link button* snippets, type some markdown (bold, a list, a `<t:…>` timestamp, a mention), break the JSON on purpose, then *Save draft*.
**Expected:** It looks like Discord's dark theme. The preview updates as you type and matches what `/post code:` later produces. Broken JSON shows a clear error, and saving shows a short code with a copy button.
**This is a feel item** — is it pleasant enough to use instead of Discohook?

---

## Interactive checks — events and help

### I18 — Events and RSVP
**Steps:** `/event create ping_role:@Member`. Fill in the title, a start time about 20 minutes out, description and an image URL (the timezone is prefilled). RSVP *Going* as yourself and *Maybe* as the alt, then click *Maybe* again as the alt.
**Expected:** A card with title, image, full and relative time, host, description and RSVP lists. Buttons update the card instantly, and clicking your current choice again removes it.
**This includes a feel item** — does the card look right?

### I19 — Event reminders
**Steps:** `/event manage` for the event. Add a second reminder channel and set times to *15 minutes before* and *At the start*. Wait for both. Then press *Send reminder now*, *Edit details* (move it), and finally *Cancel event*.
**Expected:** Each reminder arrives once in both channels, pinging the role and the people *Going*. Editing re-renders the card. Cancelling greys the card, disables the RSVP buttons and stops further reminders.

### I20 — `/help`
**Steps:** Run `/help` as the no-role alt, as Mod, as Admin and as yourself.
**Expected:** Commands are grouped by category, and each tier sees only what it can use. Context menus are listed as *(Apps menu)*.

### I21 — Timezone commands regression
**Steps:** Run `/ping`, `/time info`, and `/availability view`.
**Expected:** They behave exactly as before the discord.js upgrade.

---

## Verified by automated tests — review the design, not the pixels

### T1 — Pure logic behind the features
`pnpm test` runs 154 tests: tiers, log routing and render limits, event-log diffs and classifiers, purge filters, case rules, post payloads and V2 rules, draft codes and builder XSS safety, event times and reminder timing. Sign off that these rules are what you want; each plan's Decisions Log lists its "(assumed overnight)" choices.
(Source: `apps/bot/tests/*.test.ts`, `apps/api/tests/*.test.ts`, `docs/plans/completed/moderation/`)

---

## Deferred — not testable yet (for awareness, no verdict needed)

- **Production hosting for the API** — `docker-compose.yml` runs it locally; production compose and a reverse proxy for `/builder` are a manual step (Plan 007).
- **Graceful shutdown** — still a captured item in `TODO.md`.
- **Scheduled posts, sticky messages, reaction roles** — settled as out of scope.
- **Recurring events and native Discord Scheduled Events** — out of scope for Plan 008.
