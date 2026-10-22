---
plan: 011
title: Blackjack, Trivia and Slots
status: complete
date: 2026-10-22
updated: 2026-10-23
domain: community
depends: [010]
---

# Plan 011 — Blackjack, Trivia and Slots

**Depends on:** Plan 010 — game stats, points, daily limits, leaderboards and the game card style
**Feeds into:** Nothing downstream; the games docs describe it
**Outcome:** Three more games, all plugged into the same stats, points, daily limits and leaderboards: blackjack against the bot, slots with a staged reel reveal, and channel-wide trivia anyone can answer.

Ben picked these three from a shortlist and asked for them to look as good as possible, then said emoji were fine. So the polish comes from layout, colour and motion within Components V2 cards, not drawn images.

## Context

Plan 010 built the scaffolding: per-game stats, opt-in points, per-server daily caps on vs-bot play, leaderboards, `/stats`, and an in-memory session store for button-driven games. Each new game here is a set of rules plus a card renderer; storage and boards extend by adding the game to the enum.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Visual style | Components V2 cards with emoji and inline-code cards, accent colours by state, no generated images | Ben said emoji are fine; avoids a native image dependency |
| Blackjack rules | One deck per hand, dealer stands on all 17s, blackjack beats 21, no splits or insurance. *Hit*, *Stand* and *Double* (one card, then stand, worth double) | Standard house rules minus the rarely used options (assumed) |
| Blackjack points | Win +1, double win +2, blackjack +2; push and loss 0 | In line with Plan 010's +1 per win (assumed) |
| Slots | Three reels of 🍒 🍋 🍇 🔔 ⭐ 💎 7️⃣ with weighted odds; three of a kind pays by symbol (7️⃣ 10 down to 🍒 2), any two 🍒 pays 1. The card reveals reels one at a time | Recognisable machine with a moment of suspense (assumed) |
| Slots points | The payout, when points are on | Gives slots a reason to exist on the points board; daily caps keep it in check (assumed) |
| Trivia source | [Open Trivia DB](https://opentdb.com/) (free, no key), fetched in batches of 10 to respect its one-request-per-5-seconds limit, with a bundled fallback set when it's unreachable | Thousands of questions with categories and difficulty; the fallback keeps the game working offline (assumed) |
| Trivia flow | `/trivia [category] [difficulty]` posts a question with A–D (or True/False) buttons. Anyone may answer once in 20 seconds; answers are acknowledged privately. Then the card reveals the answer, who got it right, and who was fastest | Channel-wide play is what makes trivia fun (assumed) |
| Trivia scoring | Each answerer gets a win or loss on the trivia board. With points on, the fastest correct answer earns +2 and other correct answers +1 | Rewards speed without punishing a near miss (assumed) |
| One question per channel | A second `/trivia` while one is live is refused | Avoids overlapping questions (assumed) |
| Daily limits | Blackjack and slots join the per-game vs-bot caps; trivia's cap counts questions *started* by a member | Same control as Plan 010 (assumed) |
| Leaderboards | Blackjack, slots and trivia boards ranked by wins | Consistent with the existing game boards (assumed) |

## Open Questions

None — all resolved.

## Phase 1 — Rules and storage

- [x] Add `blackjack`, `slots` and `trivia` to the game enum, the daily-limit config and the models; schema regenerated
- [x] Pure blackjack rules: deck, hand values with soft aces, dealer play, settlement
- [x] Pure slots rules: weighted spin, payouts
- [x] Trivia question parsing, answer shuffling, and the fallback set
- [x] Tests for all of the above

**Exit criteria:** The rules are correct under test.

## Phase 2 — Games

- [x] `/blackjack` with Hit, Stand and Double, as a session
- [x] `/slots` with the staged reel reveal
- [x] `/trivia` with the Open Trivia DB client, answer buttons, private acknowledgements and the timed reveal
- [x] Cards for each game, coloured by state

**Exit criteria:** Each game plays end to end and records stats and points.

## Phase 3 — Config, boards and docs

- [x] `/config` → *Games* daily caps for the new games
- [x] Leaderboard boards and `/stats` rows for the new games
- [x] `docs/features/games.md` and the command reference updated; acceptance guide items added

**Exit criteria:** Admins can cap the new games and members can see their boards.

## Out of Scope

- Splits, insurance and multi-deck shoes in blackjack
- Betting points on a hand or spin
- Custom trivia question packs per server

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including blackjack, slots and trivia rule tests
- [ ] Blackjack plays correctly, including soft aces, the dealer standing on 17, double and blackjack (live check)
- [ ] Slots reveal reel by reel and pay per the table (live check)
- [ ] Trivia takes answers from several members, reveals after 20 seconds and credits the fastest (live check)
- [ ] The new games appear in `/config`, `/leaderboard` and `/stats` (live check)
- [x] Changes committed to git

## Notes

- 2026-10-23 — Built. Live-check acceptance items stay unticked and are covered by I11–I13 in the community acceptance guide.
- Ben first asked for the games to look as good as possible; drawn card and reel images were considered, then dropped when he said emoji were fine.
- The Open Trivia DB client was checked against the live API: batching, the cache and URL decoding all worked.
- Blackjack hands and trivia questions live in memory, so a restart abandons them.
