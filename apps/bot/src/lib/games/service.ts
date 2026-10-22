import { GameStatsModel, MemberPointsModel } from '@bedge/database';
import type { BotGame } from '@bedge/types';
import { getGuildConfig } from '../guild-config.js';
import { applyOutcome, dailyAllowance, repCooldown, utcDay, type Outcome, type StreakStats } from './logic.js';

export const GAME_LABELS: Record<BotGame, string> = { coinflip: 'Coin flip', highlow: 'High/low', dice: 'Dice' };

export async function gamesConfig(guildId: string) {
  return (await getGuildConfig(guildId)).games;
}

/** Checks the member's vs-bot allowance for today and, when allowed, uses one play. */
export async function takeDailyPlay(guildId: string, userId: string, game: BotGame): Promise<{ allowed: boolean; remaining: number | null }> {
  const { dailyLimits } = await gamesConfig(guildId);
  const today = utcDay();
  const stats = await GameStatsModel.findOne({ guildId, userId, game });
  const allowance = dailyAllowance(stats, dailyLimits[game], today);
  if (!allowance.allowed) return allowance;
  const dailyPlays = stats?.dailyDate === today ? stats.dailyPlays + 1 : 1;
  await GameStatsModel.updateOne({ guildId, userId, game }, { $set: { dailyDate: today, dailyPlays } }, { upsert: true });
  return { allowed: true, remaining: allowance.remaining === null ? null : allowance.remaining - 1 };
}

export async function recordOutcome(guildId: string, userId: string, game: BotGame, outcome: Outcome): Promise<StreakStats> {
  const doc = await GameStatsModel.findOne({ guildId, userId, game });
  const before: StreakStats = doc ?? { plays: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
  const after = applyOutcome(
    { plays: before.plays, wins: before.wins, losses: before.losses, draws: before.draws, currentStreak: before.currentStreak, bestStreak: before.bestStreak },
    outcome,
  );
  await GameStatsModel.updateOne({ guildId, userId, game }, { $set: after }, { upsert: true });
  return after;
}

/** High/low records a whole run at once: its length is the streak, and cashing out counts as a win. */
export async function recordHighLowRun(guildId: string, userId: string, run: number, cashedOut: boolean): Promise<void> {
  await GameStatsModel.updateOne(
    { guildId, userId, game: 'highlow' },
    { $inc: { plays: 1, wins: cashedOut ? 1 : 0, losses: cashedOut ? 0 : 1 }, $max: { bestStreak: run }, $set: { currentStreak: run } },
    { upsert: true },
  );
}

/** Adds points when the server has them switched on. Returns the points actually added. */
export async function awardPoints(guildId: string, userId: string, points: number): Promise<number> {
  if (points <= 0 || !(await gamesConfig(guildId)).pointsEnabled) return 0;
  await MemberPointsModel.updateOne({ guildId, userId }, { $inc: { points } }, { upsert: true });
  return points;
}

export type RepResult = { ok: true; total: number } | { ok: false; reason: 'disabled' | 'cooldown'; retryAt?: Date };

export async function giveRep(guildId: string, giverId: string, targetId: string): Promise<RepResult> {
  if (!(await gamesConfig(guildId)).pointsEnabled) return { ok: false, reason: 'disabled' };
  const now = Date.now();
  const giver = await MemberPointsModel.findOne({ guildId, userId: giverId });
  const wait = repCooldown(giver?.lastRepGivenAt, now);
  if (wait > 0) return { ok: false, reason: 'cooldown', retryAt: new Date(now + wait) };
  await MemberPointsModel.updateOne({ guildId, userId: giverId }, { $set: { lastRepGivenAt: new Date(now) } }, { upsert: true });
  const target = await MemberPointsModel.findOneAndUpdate(
    { guildId, userId: targetId },
    { $inc: { points: 1, repReceived: 1 } },
    { upsert: true, new: true },
  );
  return { ok: true, total: target.repReceived };
}

export type Board = 'points' | 'rep' | BotGame;

export interface BoardRow {
  userId: string;
  value: number;
  detail?: string;
}

export const BOARD_LABELS: Record<Board, { title: string; unit: string }> = {
  points: { title: '🏆 Points', unit: 'pts' },
  rep: { title: '💖 Rep', unit: 'rep' },
  coinflip: { title: '🪙 Coin flip — wins', unit: 'wins' },
  highlow: { title: '🃏 High/low — best run', unit: 'in a row' },
  dice: { title: '🎲 Dice — wins', unit: 'wins' },
};

export async function leaderboard(guildId: string, board: Board, limit = 100): Promise<BoardRow[]> {
  if (board === 'points' || board === 'rep') {
    const field = board === 'points' ? 'points' : 'repReceived';
    const docs = await MemberPointsModel.find({ guildId, [field]: { $gt: 0 } }).sort({ [field]: -1 }).limit(limit);
    return docs.map((d) => ({ userId: d.userId, value: board === 'points' ? d.points : d.repReceived }));
  }
  const field = board === 'highlow' ? 'bestStreak' : 'wins';
  const docs = await GameStatsModel.find({ guildId, game: board, [field]: { $gt: 0 } })
    .sort({ [field]: -1, bestStreak: -1, plays: 1 })
    .limit(limit);
  return docs.map((d) => ({
    userId: d.userId,
    value: board === 'highlow' ? d.bestStreak : d.wins,
    detail: board === 'highlow' ? `${d.plays} runs` : `${d.plays} played · best streak ${d.bestStreak}`,
  }));
}

export async function profile(guildId: string, userId: string) {
  const [points, stats] = await Promise.all([
    MemberPointsModel.findOne({ guildId, userId }),
    GameStatsModel.find({ guildId, userId }),
  ]);
  return { points: points?.points ?? 0, rep: points?.repReceived ?? 0, stats };
}
