import mongoose, { Schema, Document } from 'mongoose';
import type { GuildConfig } from '@bedge/types';

export interface GuildConfigDocument extends Omit<GuildConfig, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const LogCategoryConfigSchemaMongoose = new Schema(
  {
    channelId: { type: String },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const categoryField = { type: LogCategoryConfigSchemaMongoose, default: () => ({ enabled: true }) };

const GuildConfigSchemaMongoose = new Schema<GuildConfigDocument>(
  {
    guildId: { type: String, required: true, unique: true },
    defaultLogChannelId: { type: String },
    logs: {
      messages: categoryField,
      members: categoryField,
      moderation: categoryField,
      voice: categoryField,
      server: categoryField,
    },
    roles: {
      modRoleId: { type: String },
      adminRoleId: { type: String },
    },
    welcome: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String },
      message: { type: String },
    },
    starboard: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String },
      emoji: { type: String, default: '⭐' },
      threshold: { type: Number, default: 3 },
      selfStar: { type: Boolean, default: false },
    },
    games: {
      pointsEnabled: { type: Boolean, default: false },
      dailyLimits: {
        coinflip: { type: Number, default: 0 },
        highlow: { type: Number, default: 0 },
        dice: { type: Number, default: 0 },
        blackjack: { type: Number, default: 0 },
        slots: { type: Number, default: 0 },
        trivia: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true },
);

export const GuildConfigModel = mongoose.model<GuildConfigDocument>('GuildConfig', GuildConfigSchemaMongoose);
