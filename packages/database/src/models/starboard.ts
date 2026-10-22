import mongoose, { Schema, Document } from 'mongoose';
import type { StarboardEntry } from '@bedge/types';

export interface StarboardEntryDocument extends StarboardEntry, Document {}

const StarboardEntrySchemaMongoose = new Schema<StarboardEntryDocument>(
  {
    guildId: { type: String, required: true },
    sourceChannelId: { type: String, required: true },
    sourceMessageId: { type: String, required: true, unique: true },
    starboardMessageId: { type: String },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const StarboardEntryModel = mongoose.model<StarboardEntryDocument>('StarboardEntry', StarboardEntrySchemaMongoose);
