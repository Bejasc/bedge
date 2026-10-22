# Games and leaderboards

Members can play quick games against the bot or each other: coin flip, high/low, dice, blackjack, slots and trivia. Each game keeps its own stats per member, per server, and has a leaderboard. Servers can also switch on **points**, earned from wins and from daily rep.

## The games

### Coin flip

`/coinflip call:heads` plays: call it right and your streak grows, call it wrong and it resets. `/coinflip` with no call just flips a coin and records nothing.

### High/low

`/highlow` deals a card. Guess whether the next one is **Higher** or **Lower**. Aces are low; a tie is a push and nothing changes. Each correct guess extends your run. A wrong guess ends it, while **Cash out** banks it. Your best run goes on the leaderboard either way, but only a cash-out earns points.

Only the player can press the buttons. A game left alone for 5 minutes expires.

### Dice

| Command | What it does |
|---|---|
| `/roll [dice]` | Rolls free-form dice, e.g. `2d6`, `d20` or `3d8+2`, up to 20 dice of up to 1000 sides. Defaults to `1d6`. Nothing is recorded |
| `/dice bot [sides]` | You and the bot each roll one die (d6 unless you pick another size). Higher wins |
| `/dice duel opponent [sides]` | Challenges another member, who has 5 minutes to accept or decline. Both roll; higher wins, and both players' stats update |

### Blackjack

`/blackjack` deals you two cards and the dealer two, one face down. **Hit** takes a card, **Stand** ends your turn, and **Double** (only on your first two cards) takes exactly one more card for a win worth double. The dealer then draws to 17 and stands on any 17. Aces count 11 or 1, whichever doesn't bust; a natural blackjack beats an ordinary 21. There are no splits or insurance.

Only the player can press the buttons, and an idle hand expires after 5 minutes.

### Slots

`/slots` spins three reels of 🍒 🍋 🍇 🔔 ⭐ 💎 7️⃣, which stop one at a time. Rarer symbols come up less often and pay more:

| Line | Pays |
|---|---|
| 7️⃣ 7️⃣ 7️⃣ (jackpot) | 10 |
| 💎 💎 💎 | 6 |
| ⭐ ⭐ ⭐ | 5 |
| 🔔 🔔 🔔 | 4 |
| 🍇 🍇 🍇 | 3 |
| 🍋 🍋 🍋 or 🍒 🍒 🍒 | 2 |
| Any two 🍒 | 1 |

Any paying spin counts as a win. With points on, you earn the payout.

### Trivia

`/trivia [category] [difficulty]` asks the whole channel a question with A–D buttons, or True/False. Everyone gets one answer, confirmed privately, and the card shows how many have answered. After 20 seconds it reveals the answer, who got it right, and who was fastest.

Questions come from [Open Trivia DB](https://opentdb.com/), in a dozen categories at three difficulties. If it can't be reached, bedge asks one of its own built-in questions instead and says so on the card. One question can be live per channel at a time.

## Daily limits

Admins can cap how many games each member plays per day, separately for coin flip (with a call), high/low, dice vs the bot, blackjack and slots, and for how many trivia questions each member can start. Set the caps in `/config` → *Games*. The default is unlimited. Days reset at midnight UTC. Plain `/coinflip`, `/roll`, duels between members and answering someone else's trivia question are never capped.

## Points and rep

Points are off until an admin turns them on in `/config` → *Games*. While they're on:

| How | Points |
|---|---|
| Winning a coin flip, a dice game vs the bot, a duel or a blackjack hand | +1 |
| Winning a doubled blackjack hand, or a natural blackjack | +2 |
| Cashing out in high/low | +1 per card in the run |
| A paying slots spin | The payout |
| Answering trivia correctly | +2 for the fastest, +1 for everyone else who's right |
| Receiving rep | +1 |

`/rep user`, or right-click a member and pick *Apps → Give rep*, gives someone a point of rep. Each member can give rep once every 24 hours, not to themselves or a bot. Rep is unavailable while points are off.

## Leaderboards and stats

`/leaderboard board` shows the top 10, plus your own position if you're further down:

| Board | Ranked by |
|---|---|
| Points | Total points |
| Rep | Rep received |
| Coin flip | Wins |
| High/low | Best run |
| Dice | Wins (vs the bot and duels) |
| Blackjack | Hands won |
| Slots | Paying spins |
| Trivia | Correct answers |

`/stats [user]` shows a member's points and rep, and their wins, losses and best streak or run in each game.
