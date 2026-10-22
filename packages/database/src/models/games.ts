import mongoose, { Schema, Document } from 'mongoose';
import type { GameStats, MemberPoints } from '@bedge/types';

export interface GameStatsDocument extends GameStats, Document {}
export interface MemberPointsDocument extends Omit<MemberPoints, 'lastRepGivenAt'>, Document {
  lastRepGivenAt?: Date;
}

const count = { type: Number, default: 0 };

const GameStatsSchemaMongoose = new Schema<GameStatsDocument>({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  game: { type: String, enum: ['coinflip', 'highlow', 'dice'], required: true },
  plays: count,
  wins: count,
  losses: count,
  draws: count,
  currentStreak: count,
  bestStreak: count,
  dailyDate: { type: String },
  dailyPlays: count,
});
GameStatsSchemaMongoose.index({ guildId: 1, userId: 1, game: 1 }, { unique: true });
GameStatsSchemaMongoose.index({ guildId: 1, game: 1, wins: -1 });

const MemberPointsSchemaMongoose = new Schema<MemberPointsDocument>({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  points: count,
  repReceived: count,
  lastRepGivenAt: { type: Date },
});
MemberPointsSchemaMongoose.index({ guildId: 1, userId: 1 }, { unique: true });
MemberPointsSchemaMongoose.index({ guildId: 1, points: -1 });

export const GameStatsModel = mongoose.model<GameStatsDocument>('GameStats', GameStatsSchemaMongoose);
export const MemberPointsModel = mongoose.model<MemberPointsDocument>('MemberPoints', MemberPointsSchemaMongoose);
