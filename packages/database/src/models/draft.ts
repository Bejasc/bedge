import mongoose, { Schema, Document } from 'mongoose';
import type { Draft } from '@bedge/types';

export const DRAFT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface DraftDocument extends Omit<Draft, 'createdAt'>, Document {
  createdAt: Date;
}

const DraftSchemaMongoose = new Schema<DraftDocument>(
  {
    code: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
    source: {
      type: new Schema({ guildId: String, channelId: String, messageId: String }, { _id: false }),
      required: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

DraftSchemaMongoose.index({ createdAt: 1 }, { expireAfterSeconds: DRAFT_TTL_SECONDS });

export const DraftModel = mongoose.model<DraftDocument>('Draft', DraftSchemaMongoose);
