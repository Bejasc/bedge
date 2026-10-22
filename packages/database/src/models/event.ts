import mongoose, { Schema, Document } from 'mongoose';
import type { GuildEvent } from '@bedge/types';

export interface GuildEventDocument extends Omit<GuildEvent, 'startsAt'>, Document {
  startsAt: Date;
}

const OFFSETS = ['1w', '1d', '12h', '6h', '3h', '1h', '30m', '15m', '10m', '5m', 'start'];

const GuildEventSchemaMongoose = new Schema<GuildEventDocument>(
  {
    guildId: { type: String, required: true },
    eventNumber: { type: Number, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    startsAt: { type: Date, required: true },
    timezone: { type: String, required: true },
    hostId: { type: String, required: true },
    pingRoleId: { type: String },
    reminderChannelIds: { type: [String], default: [] },
    reminderOffsets: { type: [{ type: String, enum: OFFSETS }], default: ['1h', 'start'] },
    sentOffsets: { type: [{ type: String, enum: OFFSETS }], default: [] },
    rsvps: {
      type: [new Schema({ userId: String, status: { type: String, enum: ['going', 'maybe', 'no'] } }, { _id: false })],
      default: [],
    },
    cancelled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

GuildEventSchemaMongoose.index({ guildId: 1, eventNumber: 1 }, { unique: true });
GuildEventSchemaMongoose.index({ cancelled: 1, startsAt: 1 });

export const GuildEventModel = mongoose.model<GuildEventDocument>('GuildEvent', GuildEventSchemaMongoose);
