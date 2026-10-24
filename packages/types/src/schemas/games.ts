import { z } from 'zod';
import { BotGameSchema } from './guild-config.js';

export const GameStatsSchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  game: BotGameSchema,
  plays: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  /** UTC date (`YYYY-MM-DD`) that `dailyPlays` counts. */
  dailyDate: z.string().optional(),
  dailyPlays: z.number().int().nonnegative(),
});
export type GameStats = z.infer<typeof GameStatsSchema>;

export const MemberPointsSchema = z.object({
  guildId: z.string(),
  userId: z.string(),
  points: z.number().int(),
  repReceived: z.number().int().nonnegative(),
  lastRepGivenAt: z.string().datetime().optional(),
});
export type MemberPoints = z.infer<typeof MemberPointsSchema>;
