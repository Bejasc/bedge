import mongoose, { Schema, Document } from 'mongoose';
import type { TimeTrackConfig } from '@bedge/types';

export interface TimeTrackConfigDocument extends Omit<TimeTrackConfig, 'createdAt'>, Document {
  createdAt: Date; // Mongoose timestamps; Zod schema represents this as ISO string
}

const TimeTrackConfigSchemaMongoose = new Schema<TimeTrackConfigDocument>(
  {
    guildId: { type: String, required: true },
    memberId: { type: String, required: true },
    timezone: { type: String, required: true },
    categoryId: { type: String, required: true },
    channelId: { type: String },
    alias: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

TimeTrackConfigSchemaMongoose.index({ guildId: 1, memberId: 1 }, { unique: true });

export const TimeTrackConfigModel = mongoose.model<TimeTrackConfigDocument>(
  'TimeTrackConfig',
  TimeTrackConfigSchemaMongoose,
);
