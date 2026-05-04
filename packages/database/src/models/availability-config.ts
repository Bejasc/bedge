import mongoose, { Schema, Document } from 'mongoose';
import type { AvailabilityConfig } from '@bedge/types';

export interface AvailabilityConfigDocument extends AvailabilityConfig, Document {}

const AvailabilityWindowSchemaMongoose = new Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
    level: { type: String, enum: ['green', 'yellow', 'orange', 'red'], required: true },
  },
  { _id: false },
);

const AvailabilityConfigSchemaMongoose = new Schema<AvailabilityConfigDocument>({
  guildId: { type: String, required: true },
  memberId: { type: String, required: true },
  broad: { type: [AvailabilityWindowSchemaMongoose], default: [] },
  weekdays: { type: Map, of: [AvailabilityWindowSchemaMongoose], default: {} },
});

AvailabilityConfigSchemaMongoose.index({ guildId: 1, memberId: 1 }, { unique: true });

export const AvailabilityConfigModel = mongoose.model<AvailabilityConfigDocument>(
  'AvailabilityConfig',
  AvailabilityConfigSchemaMongoose,
);
