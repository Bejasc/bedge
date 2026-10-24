import { describe, it, expect } from 'vitest';
import {
  applyOutcome,
  cardLabel,
  compareRolls,
  dailyAllowance,
  drawCard,
  flipCoin,
  formatDice,
  judgeGuess,
  parseDice,
  rankOf,
  repCooldown,
  rollDice,
  utcDay,
  REP_COOLDOWN_MS,
  type Random,
} from '../src/lib/games/logic.js';
import { renderLeaderboard, renderProfile } from '../src/lib/games/render.js';
import { startHighLow } from '../src/lib/games/sessions.js';

const sequence = (...values: number[]): Random => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('coin flip', () => {
  it('maps the random bit to a side', () => {
    expect(flipCoin(() => 0)).toBe('heads');
    expect(flipCoin(() => 1)).toBe('tails');
  });
});

describe('dice', () => {
  it('parses common notation', () => {
    expect(parseDice('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDice('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    expect(parseDice('3D8 + 2')).toEqual({ count: 3, sides: 8, modifier: 2 });
    expect(parseDice('1d100-5')).toEqual({ count: 1, sides: 100, modifier: -5 });
  });

  it('rejects invalid or oversized rolls', () => {
    expect(parseDice('fireball')).toBeNull();
    expect(parseDice('0d6')).toBeNull();
    expect(parseDice('21d6')).toBeNull();
    expect(parseDice('1d1')).toBeNull();
    expect(parseDice('1d1001')).toBeNull();
    expect(parseDice('1d6+5000')).toBeNull();
  });

  it('rolls 1..sides per die and adds the modifier', () => {
    expect(rollDice({ count: 3, sides: 6, modifier: 2 }, sequence(0, 5, 2))).toEqual({ rolls: [1, 6, 3], total: 12 });
    expect(formatDice({ count: 3, sides: 6, modifier: -1 })).toBe('3d6-1');
  });

  it('compares rolls', () => {
    expect(compareRolls(5, 3)).toBe('win');
    expect(compareRolls(2, 3)).toBe('loss');
    expect(compareRolls(4, 4)).toBe('draw');
  });
});

describe('high/low', () => {
  it('draws labelled cards', () => {
    expect(cardLabel(drawCard(sequence(0, 1)))).toBe('A♥');
    expect(cardLabel(drawCard(sequence(12, 3)))).toBe('K♣');
  });

  it('judges guesses, with ties as a push', () => {
    const five = { rank: 5, suit: '♠' as const };
    expect(judgeGuess(five, { rank: 9, suit: '♥' }, 'higher')).toBe('win');
    expect(judgeGuess(five, { rank: 2, suit: '♥' }, 'higher')).toBe('loss');
    expect(judgeGuess(five, { rank: 2, suit: '♥' }, 'lower')).toBe('win');
    expect(judgeGuess(five, { rank: 5, suit: '♥' }, 'lower')).toBe('draw');
  });
});

describe('applyOutcome', () => {
  const zero = { plays: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };

  it('tracks streaks across wins, draws and losses', () => {
    let s = applyOutcome(zero, 'win');
    s = applyOutcome(s, 'win');
    s = applyOutcome(s, 'draw');
    expect(s).toMatchObject({ plays: 3, wins: 2, draws: 1, currentStreak: 2, bestStreak: 2 });
    s = applyOutcome(s, 'loss');
    s = applyOutcome(s, 'win');
    expect(s).toMatchObject({ plays: 5, losses: 1, currentStreak: 1, bestStreak: 2 });
  });
});

describe('dailyAllowance', () => {
  it('treats 0 as unlimited', () => {
    expect(dailyAllowance({ dailyDate: '2026-10-22', dailyPlays: 99 }, 0, '2026-10-22')).toEqual({ allowed: true, remaining: null });
  });

  it('counts today and resets on a new day', () => {
    expect(dailyAllowance({ dailyDate: '2026-10-22', dailyPlays: 2 }, 3, '2026-10-22')).toEqual({ allowed: true, remaining: 1 });
    expect(dailyAllowance({ dailyDate: '2026-10-22', dailyPlays: 3 }, 3, '2026-10-22')).toEqual({ allowed: false, remaining: 0 });
    expect(dailyAllowance({ dailyDate: '2026-10-21', dailyPlays: 3 }, 3, '2026-10-22')).toEqual({ allowed: true, remaining: 3 });
    expect(dailyAllowance(null, 3, '2026-10-22')).toEqual({ allowed: true, remaining: 3 });
  });

  it('uses UTC days', () => {
    expect(utcDay(Date.UTC(2026, 9, 22, 23, 59))).toBe('2026-10-22');
  });
});

describe('rep cooldown', () => {
  it('is free the first time and 24 hours after the last rep', () => {
    const now = Date.UTC(2026, 9, 22);
    expect(repCooldown(undefined, now)).toBe(0);
    expect(repCooldown(new Date(now - 1000), now)).toBe(REP_COOLDOWN_MS - 1000);
    expect(repCooldown(new Date(now - REP_COOLDOWN_MS), now)).toBe(0);
  });
});

describe('game cards', () => {
  it('ranks the leaderboard with medals and shows the caller beyond the top 10', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ userId: `u${i}`, value: 12 - i }));
    const json = JSON.stringify(renderLeaderboard('coinflip', rows, 'u11', 'SWRPG').components[0].toJSON());
    expect(json).toContain('🥇 <@u0> — **12** wins');
    expect(json).not.toContain('<@u11>');
    expect(json).toContain("You're **#12** with 1 wins.");
  });

  it('marks an empty board', () => {
    expect(JSON.stringify(renderLeaderboard('points', [], 'u', 'S').components[0].toJSON())).toContain('Nobody yet');
  });

  it('builds a profile with every game', () => {
    const json = JSON.stringify(
      renderProfile({
        userId: '1',
        username: 'ben',
        points: 7,
        rep: 2,
        pointsEnabled: true,
        stats: [{ game: 'highlow', plays: 3, wins: 1, losses: 2, draws: 0, bestStreak: 6 }],
      }).components[0].toJSON(),
    );
    expect(json).toContain('**7** points');
    expect(json).toContain('best run 6');
    expect(json).toContain('**Coin flip** — not played yet');
  });

  it('starts a valid high/low game with cash-out disabled', () => {
    const json = JSON.stringify(startHighLow('g', 'u', '2 left today').components[0].toJSON());
    expect(json).toContain('Higher');
    expect(json).toContain('"disabled":true');
    expect(json).toContain('2 left today');
  });
});

describe('rankOf', () => {
  it('finds the 1-based rank or null', () => {
    expect(rankOf(['a', 'b', 'c'], (r) => r === 'c')).toBe(3);
    expect(rankOf(['a'], (r) => r === 'z')).toBeNull();
  });
});
