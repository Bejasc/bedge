import mongoose, { Schema, Document } from 'mongoose';
import type { ModCase } from '@bedge/types';

export interface ModCaseDocument extends Omit<ModCase, 'expiresAt' | 'createdAt'>, Document {
  expiresAt?: Date;
  createdAt: Date;
}

const ModCaseSchemaMongoose = new Schema<ModCaseDocument>(
  {
    guildId: { type: String, required: true },
    caseNumber: { type: Number, required: true },
    type: { type: String, enum: ['note', 'warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban'], required: true },
    targetId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    expiresAt: { type: Date },
    source: { type: String, enum: ['bot', 'audit'], required: true },
    logUrl: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ModCaseSchemaMongoose.index({ guildId: 1, caseNumber: 1 }, { unique: true });
ModCaseSchemaMongoose.index({ guildId: 1, targetId: 1, createdAt: -1 });

export const ModCaseModel = mongoose.model<ModCaseDocument>('ModCase', ModCaseSchemaMongoose);
