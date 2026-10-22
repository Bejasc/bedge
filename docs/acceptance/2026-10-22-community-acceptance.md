# Starboard and Games — Acceptance & Review

> **What this is.** A guided review of the starboard (Plan 009), the games, rep and leaderboards (Plan 010), and blackjack, slots and trivia (Plan 011). One item per thing you can see or do; most take a minute or two.
>
> **Scope note.** Built and unit-tested, and the games' database logic was checked against a throwaway MongoDB. Nothing has run in a live server yet. T1 covers what the tests prove.

---

## How to give feedback (the stoplight)

Set each item's **Verdict** cell to a dot, with a short note after it if useful (e.g. `🟡 — cash-out button too easy to hit`).

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
| I1 | Starboard setup in `/config` | Test server | ⚫ |
| I2 | Starring posts, updates and removes | Test server | ⚫ |
| I3 | Custom emoji and self-stars | Test server | ⚫ |
| I4 | Coin flip | Test server | ⚫ |
| I5 | High/low | Test server | ⚫ |
| I6 | Dice: roll, vs bot, duel | Test server | ⚫ |
| I7 | Daily limits | Test server | ⚫ |
| I8 | Points and rep | Test server | ⚫ |
| I9 | Leaderboards and `/stats` | Test server | ⚫ |
| I10 | README and feature docs | GitHub | ⚫ |
| I11 | Blackjack | Test server | ⚫ |
| I12 | Slots | Test server | ⚫ |
| I13 | Trivia | Test server | ⚫ |
| T1 | Starboard and game rules | Automated tests | ⚫ |

---

## Setup

Use the test server from the Dyno-replacement guide, with your alt account. Restart the bot once so it picks up the new reaction intent and registers the new commands.

---

## Interactive checks — starboard

### I1 — Starboard setup
**Steps:** `/config` → *Starboard*. Pick a channel, set the threshold to 2, and enable it.
**Expected:** The summary shows the channel, ⭐, "Needs: 2" and "Self-stars: don't count", and each change posts a *Config changed* log.

### I2 — Starring
**Steps:** Post a message with an image from your alt. Star it with your main account: nothing happens yet. Star it with a third account, or lower the threshold to 1. Add one more star, then remove stars until it drops below the threshold.
**Expected:** At the threshold, a card appears in the starboard channel with author, text, image, ⭐ count and *Jump to message*. Extra stars update the count on the same post. Dropping below the threshold deletes it.
**This includes a feel item** — does the card look right?

### I3 — Custom emoji and self-stars
**Steps:** *Set emoji* to a custom server emoji (type `\:name:` in chat to get its `<:name:id>` form). Star your own message with it, then switch *Count self-stars* on.
**Expected:** The custom emoji is accepted and shown in the panel. Your own star counts only once self-stars are on. Bot reactions never count.

---

## Interactive checks — games

### I4 — Coin flip
**Steps:** `/coinflip` with no call, then `/coinflip call:heads` several times.
**Expected:** A plain flip shows a result and records nothing. Calls show win or lose with the streak, and the card turns green or red.

### I5 — High/low
**Steps:** `/highlow`. Guess a few times, try pressing the buttons from your alt, then cash out. Start another and play until you bust.
**Expected:** Cash-out is disabled until you have a run. A tie says "push". Your alt is told it isn't their game. Cashing out ends the game with the run banked; a wrong guess ends it red.
**This is a feel item** — is it fun? Too easy, too slow?

### I6 — Dice
**Steps:** `/roll 3d6+2`, `/roll fireball`, `/dice bot sides:20`, then `/dice duel opponent:@alt` and accept as the alt. Start another duel and decline it.
**Expected:** `/roll` shows the total and each die, and explains the error on bad input. Vs bot shows both rolls and the result. The duel pings the alt, only the alt can answer, and both players' stats update.

### I7 — Daily limits
**Steps:** `/config` → *Games*: set coin flip to 1 per day. Play `/coinflip call:tails` twice. Then try a plain `/coinflip`.
**Expected:** The first called flip says "0 left today". The second is refused, with when plays reset. The plain flip still works.

### I8 — Points and rep
**Steps:** With points off, try `/rep @alt`. Turn points on in `/config` → *Games*. `/rep @alt`, then *Apps → Give rep* on someone else. Win a coin flip and cash out a high/low run.
**Expected:** Rep is refused while points are off. Once on, the first rep works and the second is refused with when you can rep again. Wins add 1 point; a cash-out adds the run length.

### I9 — Leaderboards and stats
**Steps:** `/leaderboard board:` each of Points, Rep, Coin flip, High/low and Dice. Then `/stats` and `/stats user:@alt`.
**Expected:** Each board ranks correctly with medals for the top three, and marks you. `/stats` shows points, rep and every game's record.

### I11 — Blackjack
**Steps:** `/blackjack` a few times. Hit, stand and double down at least once each; try pressing your buttons from the alt.
**Expected:** The dealer's second card stays hidden (`🂠`) until you stand. Soft hands read e.g. "17 (soft)". The dealer draws to 17. Double is only offered on two cards and takes exactly one more. The result line, colour and points match what happened, and the alt is told it isn't their hand.
**This is a feel item** — does the table read clearly at a glance?

### I12 — Slots
**Steps:** `/slots` several times, with points on.
**Expected:** The reels start as 🌀 and stop one at a time, then the result shows with the pay table underneath. Paying spins turn the card green (gold for a 7️⃣ jackpot) and add the payout to your points.
**This is a feel item** — is the reveal satisfying, or too slow?

### I13 — Trivia
**Steps:** `/trivia category:Video Games`. Answer from your main account and the alt, one right and one wrong. Try answering twice, and try starting a second `/trivia` in the same channel.
**Expected:** Each answer is confirmed privately and the card's answer count goes up. A second answer and a second question are refused. After 20 seconds the card reveals the correct button in green, the fastest correct answer with its time, and who was wrong; `/leaderboard board:Trivia` reflects it.

---

## Interactive checks — docs

### I10 — README and feature docs
**Steps:** Open the repository on GitHub and read the README, then follow its links into `docs/features/`.
**Expected:** The README explains what bedge is in a few paragraphs, and each feature page explains its commands accurately enough that a server admin could use them without asking you.
**This is a feel item** — right level of detail?

---

## Verified by automated tests — review the design, not the pixels

### T1 — Starboard and game rules
The tests cover emoji parsing (unicode and custom), star counting without bots or (optionally) the author, and the post/update/remove decisions. For games they cover dice notation and limits, card judging with ties as a push, blackjack hand values, dealer play and settlement, slots odds and payouts, trivia parsing, shuffling and scoring, streak tracking, the UTC daily allowance, the 24-hour rep cooldown, and leaderboard and profile rendering. Sign off that these are the rules you want; each plan's Decisions Log lists its assumed choices.
(Source: `apps/bot/tests/starboard.test.ts`, `apps/bot/tests/games.test.ts`, `apps/bot/tests/blackjack.test.ts`, `apps/bot/tests/slots.test.ts`, `apps/bot/tests/trivia.test.ts`, `docs/plans/completed/community/`)

---

## Deferred — not testable yet (for awareness, no verdict needed)

- **GitHub wiki** — the wiki has no pages yet, so its git repo doesn't exist. Once a first page is created in the web UI, the feature docs can be mirrored there.
- **Games surviving a restart** — high/low and duels in progress are lost on restart, by design.
