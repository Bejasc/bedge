import { randomInt } from 'node:crypto';

/** Returns an integer in [0, max). Injected so tests are deterministic. */
export type Random = (max: number) => number;
export const secureRandom: Random = (max) => randomInt(max);

export type Coin = 'heads' | 'tails';

export function flipCoin(random: Random = secureRandom): Coin {
  return random(2) === 0 ? 'heads' : 'tails';
}

export interface DiceSpec {
  count: number;
  sides: number;
  modifier: number;
}

export const DICE_LIMITS = { count: 20, sides: 1000, modifier: 1000 };

/** Parses `d20`, `2d6`, `3d8+2`, `1d100-5`. Returns null when the notation is invalid or out of range. */
export function parseDice(input: string): DiceSpec | null {
  const m = input.replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return null;
  const spec = { count: m[1] ? Number(m[1]) : 1, sides: Number(m[2]), modifier: m[3] ? Number(m[3]) : 0 };
  if (spec.count < 1 || spec.count > DICE_LIMITS.count) return null;
  if (spec.sides < 2 || spec.sides > DICE_LIMITS.sides) return null;
  if (Math.abs(spec.modifier) > DICE_LIMITS.modifier) return null;
  return spec;
}

export function rollDice(spec: DiceSpec, random: Random = secureRandom): { rolls: number[]; total: number } {
  const rolls = Array.from({ length: spec.count }, () => random(spec.sides) + 1);
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) + spec.modifier };
}

export function formatDice(spec: DiceSpec): string {
  const mod = spec.modifier ? `${spec.modifier > 0 ? '+' : ''}${spec.modifier}` : '';
  return `${spec.count}d${spec.sides}${mod}`;
}

export interface Card {
  rank: number;
  suit: '♠' | '♥' | '♦' | '♣';
}

const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];

export function drawCard(random: Random = secureRandom): Card {
  return { rank: random(13) + 1, suit: SUITS[random(4)] };
}

export function cardLabel(card: Card): string {
  return `${RANK_LABELS[card.rank - 1]}${card.suit}`;
}

export type Guess = 'higher' | 'lower';
export type Outcome = 'win' | 'loss' | 'draw';

export function judgeGuess(previous: Card, next: Card, guess: Guess): Outcome {
  if (next.rank === previous.rank) return 'draw';
  return (next.rank > previous.rank) === (guess === 'higher') ? 'win' : 'loss';
}

export function compareRolls(mine: number, theirs: number): Outcome {
  return mine === theirs ? 'draw' : mine > theirs ? 'win' : 'loss';
}

export interface StreakStats {
  plays: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
}

/** Records one game's outcome. A win extends the streak, a loss ends it, a draw leaves it alone. */
export function applyOutcome(stats: StreakStats, outcome: Outcome): StreakStats {
  const next = { ...stats, plays: stats.plays + 1 };
  if (outcome === 'win') {
    next.wins++;
    next.currentStreak++;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  } else if (outcome === 'loss') {
    next.losses++;
    next.currentStreak = 0;
  } else {
    next.draws++;
  }
  return next;
}

export function utcDay(at: number = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** How many vs-bot plays are left today; a limit of 0 means unlimited. */
export function dailyAllowance(
  stats: { dailyDate?: string; dailyPlays: number } | null,
  limit: number,
  today: string,
): { allowed: boolean; remaining: number | null } {
  if (limit <= 0) return { allowed: true, remaining: null };
  const used = stats?.dailyDate === today ? stats.dailyPlays : 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

export const REP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Milliseconds until the giver can rep again; 0 when they can now. */
export function repCooldown(lastRepGivenAt: Date | null | undefined, now: number = Date.now()): number {
  if (!lastRepGivenAt) return 0;
  return Math.max(0, lastRepGivenAt.getTime() + REP_COOLDOWN_MS - now);
}

export function rankOf<T>(rows: readonly T[], isCaller: (row: T) => boolean): number | null {
  const index = rows.findIndex(isCaller);
  return index === -1 ? null : index + 1;
}
