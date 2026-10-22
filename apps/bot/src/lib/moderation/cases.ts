import { ModCaseModel, nextSequence, type ModCaseDocument } from '@bedge/database';
import type { ModCaseType } from '@bedge/types';

export interface NewCase {
  guildId: string;
  type: ModCaseType;
  targetId: string;
  moderatorId: string;
  reason: string;
  expiresAt?: Date;
  source: 'bot' | 'audit';
}

export async function createCase(input: NewCase): Promise<ModCaseDocument> {
  const caseNumber = await nextSequence(`cases:${input.guildId}`);
  return ModCaseModel.create({ ...input, caseNumber });
}

export function getCase(guildId: string, caseNumber: number): Promise<ModCaseDocument | null> {
  return ModCaseModel.findOne({ guildId, caseNumber });
}

export function listCases(guildId: string, targetId: string, limit = 10): Promise<ModCaseDocument[]> {
  return ModCaseModel.find({ guildId, targetId }).sort({ createdAt: -1 }).limit(limit);
}

export async function countCases(guildId: string, targetId: string): Promise<Partial<Record<ModCaseType, number>>> {
  const rows = await ModCaseModel.aggregate<{ _id: ModCaseType; n: number }>([
    { $match: { guildId, targetId } },
    { $group: { _id: '$type', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

export function setCaseLogUrl(id: unknown, logUrl: string): Promise<unknown> {
  return ModCaseModel.updateOne({ _id: id }, { $set: { logUrl } });
}

export function updateCaseReason(guildId: string, caseNumber: number, reason: string): Promise<ModCaseDocument | null> {
  return ModCaseModel.findOneAndUpdate({ guildId, caseNumber }, { $set: { reason } }, { new: true });
}

export function deleteCase(guildId: string, caseNumber: number): Promise<ModCaseDocument | null> {
  return ModCaseModel.findOneAndDelete({ guildId, caseNumber });
}
