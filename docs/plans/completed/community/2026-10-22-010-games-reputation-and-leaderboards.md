---
plan: 010
title: Games, Reputation and Leaderboards
status: complete
date: 2026-10-22
updated: 2026-10-22
domain: community
depends: [003]
---

# Plan 010 — Games, Reputation and Leaderboards

**Depends on:** Plan 003 — guild config, the `/config` panel and the Components V2 style
**Feeds into:** Nothing downstream; the feature docs describe it
**Outcome:** Members can play coin flip, high/low and dice against the bot or each other, give each other rep, and climb per-game and points leaderboards, all within limits each server sets.

bedge so far is all admin tooling. This plan gives members something to do with it: quick games with stats worth bragging about, and a light points system servers can switch on.

## Context

Ben asked for high/low, coin flip and dice with leaderboards, after the Dyno-replacement plans. He chose per-game stats rather than a betting economy. Points are an opt-in server setting, earned by game wins and by `/rep`, which any member can give once a day. Servers can also cap how many vs-bot games a member plays per day.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Scoring model | Stats per game per member per server: plays, wins, losses, draws, current and best streak | Ben's choice |
| Points | Off by default; a server turns them on in `/config`. When on: +1 for a coin flip or dice win, a high/low cash-out earns its streak length, and `/rep` gives +1. `/rep` is unavailable while points are off | Ben's choice for an opt-in points system with rep; the earning rates are assumed |
| Rep | `/rep @user` and a *Give rep* user context menu; once per giver per rolling 24 hours; not to yourself or bots | Ben's choice of a 24h rep; the context menu is assumed (user slots become 4/5) |
| Dice | `/roll` for free-form `NdM±K` rolls (no stats); `/dice bot` rolls against the bot; `/dice duel @user` challenges a member, who accepts or declines | Ben asked for all three |
| Daily limits | One cap per vs-bot game (coin flip with a call, high/low, dice vs bot), per member per UTC day, set in `/config`; unlimited by default. Duels and plain rolls aren't capped | Ben asked for daily caps on bot rolls; extending the cap to the other vs-bot games and using UTC days is assumed |
| Coin flip | `/coinflip call:heads·tails` plays and scores; with no call it just flips | A plain flip is still useful for settling things (assumed) |
| High/low | Cards A–K drawn with replacement; *Higher*, *Lower* or *Cash out*. A tie is a push (no change), a wrong guess ends the run, cashing out banks it. Best streak = longest run of correct guesses. Only the player can press the buttons; games expire after 5 minutes idle | Familiar rules with a reason to cash out when points are on (assumed) |
| Leaderboards | `/leaderboard board:` points, rep, coin flip (wins), high/low (best streak), dice (wins). Top 10 plus the caller's own rank | One command with a board choice (assumed) |
| Profile | `/stats [user]` shows a member's points, rep and every game's stats | Makes the stats visible outside leaderboards (assumed) |
| Who can play | Everyone; no tier | Games are for members (assumed) |
| Logs | Games and rep aren't logged | They're not moderation events and would flood the log (assumed) |

## Open Questions

None — all resolved.

## Phase 1 — Models, config and pure logic

- [x] `games` block in `GuildConfig` (points toggle, daily limits); `GameStats` and `MemberPoints` schemas and models; schemas regenerated
- [x] Pure helpers with tests: coin flip, dice notation parsing and rolling, card draw and high/low judging, streak and result application, daily allowance, rep cooldown, leaderboard ordering
- [x] *Games* section in `/config`: points toggle and a daily-limit select per vs-bot game

**Exit criteria:** The rules behave correctly under test and a server can configure points and limits.

## Phase 2 — Games

- [x] `/coinflip`, `/roll`, `/dice bot`, `/dice duel` with accept/decline
- [x] `/highlow` with an interactive card and per-player button checks
- [x] Result cards in the Components V2 style; stats and points updated after each game

**Exit criteria:** Each game plays end to end and updates stats; daily limits refuse play once reached.

## Phase 3 — Rep, leaderboards and profiles

- [x] `/rep` and the *Give rep* context menu with the 24-hour cooldown
- [x] `/leaderboard` and `/stats`

**Exit criteria:** Rep, leaderboards and profiles reflect play.

## Out of Scope

- Betting or a points economy beyond earning
- Cross-server leaderboards
- Other games (blackjack, trivia, etc.)
- Shops or rewards for points

## Acceptance Criteria

- [x] `pnpm build` and `pnpm test` pass, including game-logic tests
- [ ] Coin flip, high/low, dice vs bot and dice duel play correctly and update `/stats` (live check)
- [ ] Daily limits stop vs-bot play once reached (live check)
- [ ] With points on, wins and `/rep` add points; rep is limited to once per 24 hours (live check)
- [ ] `/leaderboard` shows each board in the right order (live check)
- [x] Changes committed to git

## Notes

- 2026-10-22 — Built. Live-check acceptance items stay unticked and are covered by the community acceptance guide.
- The games service was exercised against a throwaway Mongo: daily limits, streak persistence, best high/low run, points on/off, the rep cooldown, leaderboard order and profiles all behaved.
- High/low and duel state is in memory, so a restart abandons games in progress (and their daily play stays used).
- Context menu budget after this plan: user 4/5, message 3/5.
