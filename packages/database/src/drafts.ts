import { randomInt } from 'node:crypto';
import type { DraftSource, PostPayload } from '@bedge/types';
import { DRAFT_TTL_SECONDS, DraftModel } from './models/draft.js';

/** No 0/O, 1/I/L — codes get typed into `/post code:` by hand. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function generateDraftCode(random: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return code;
}

export function normaliseDraftCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export interface DraftView {
  code: string;
  payload: PostPayload;
  source?: DraftSource;
  expiresAt: string;
}

function view(doc: InstanceType<typeof DraftModel>): DraftView {
  const source = doc.source?.messageId
    ? { guildId: doc.source.guildId, channelId: doc.source.channelId, messageId: doc.source.messageId }
    : undefined;
  return {
    code: doc.code,
    payload: doc.payload,
    source,
    expiresAt: new Date(doc.createdAt.getTime() + DRAFT_TTL_SECONDS * 1000).toISOString(),
  };
}

export async function createDraft(payload: PostPayload, source?: DraftSource): Promise<DraftView> {
  // A collision is astronomically unlikely, but retrying is cheaper than reasoning about it.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return view(await DraftModel.create({ code: generateDraftCode(), payload, source }));
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  throw new Error('Could not allocate a draft code');
}

export async function findDraft(code: string): Promise<DraftView | null> {
  const normalised = normaliseDraftCode(code);
  const doc = normalised ? await DraftModel.findOne({ code: normalised }) : null;
  return doc ? view(doc) : null;
}
