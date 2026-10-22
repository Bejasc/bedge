export const BULK_DELETE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface PurgeCandidate {
  id: string;
  authorId: string;
  authorBot: boolean;
  content: string;
  hasAttachments: boolean;
  pinned: boolean;
  createdTimestamp: number;
}

export interface PurgeFilters {
  amount: number;
  userId?: string;
  contains?: string;
  bots?: boolean;
  attachments?: boolean;
  links?: boolean;
}

const LINK = /https?:\/\/\S+/i;

/** Candidates newest-first; returns up to `amount` IDs that match every filter. Pinned and too-old messages are kept. */
export function selectForPurge(candidates: PurgeCandidate[], filters: PurgeFilters, now = Date.now()): string[] {
  const needle = filters.contains?.toLowerCase();
  return candidates
    .filter((m) => !m.pinned && now - m.createdTimestamp < BULK_DELETE_MAX_AGE_MS)
    .filter((m) => !filters.userId || m.authorId === filters.userId)
    .filter((m) => !needle || m.content.toLowerCase().includes(needle))
    .filter((m) => !filters.bots || m.authorBot)
    .filter((m) => !filters.attachments || m.hasAttachments)
    .filter((m) => !filters.links || LINK.test(m.content))
    .slice(0, filters.amount)
    .map((m) => m.id);
}

export function describeFilters(filters: PurgeFilters): string {
  const parts: string[] = [];
  if (filters.userId) parts.push(`from <@${filters.userId}>`);
  if (filters.contains) parts.push(`containing "${filters.contains}"`);
  if (filters.bots) parts.push('from bots');
  if (filters.attachments) parts.push('with attachments');
  if (filters.links) parts.push('with links');
  return parts.length ? parts.join(', ') : 'any';
}
