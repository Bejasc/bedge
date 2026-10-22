import type { ModCaseType } from '@bedge/types';

const PENDING_MS = 30_000;
const pending = new Map<string, number>();

const keyOf = (guildId: string, targetId: string, type: ModCaseType) => `${guildId}:${targetId}:${type}`;

/** Tells the audit-log listener that bedge already recorded this action. */
export function markPending(guildId: string, targetId: string, type: ModCaseType): void {
  pending.set(keyOf(guildId, targetId, type), Date.now());
}

export function consumePending(guildId: string, targetId: string, type: ModCaseType): boolean {
  const key = keyOf(guildId, targetId, type);
  const at = pending.get(key);
  pending.delete(key);
  return at !== undefined && Date.now() - at < PENDING_MS;
}
