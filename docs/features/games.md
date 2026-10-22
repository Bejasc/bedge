# Games and leaderboards

Members can play quick games against the bot or each other. Each game keeps its own stats per member, per server, and has a leaderboard. Servers can also switch on **points**, earned from wins and from daily rep.

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

## Daily limits

Admins can cap how many games each member plays **against the bot** per day, separately for coin flip (with a call), high/low and dice vs the bot. Set the caps in `/config` → *Games*. The default is unlimited. Days reset at midnight UTC. Plain `/coinflip`, `/roll` and duels between members are never capped.

## Points and rep

Points are off until an admin turns them on in `/config` → *Games*. While they're on:

| How | Points |
|---|---|
| Winning a coin flip, a dice game vs the bot, or a duel | +1 |
| Cashing out in high/low | +1 per card in the run |
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

`/stats [user]` shows a member's points and rep, and their wins, losses and best streak or run in each game.
