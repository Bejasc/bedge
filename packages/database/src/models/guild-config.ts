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
  },
  { timestamps: true },
);

export const GuildConfigModel = mongoose.model<GuildConfigDocument>('GuildConfig', GuildConfigSchemaMongoose);
