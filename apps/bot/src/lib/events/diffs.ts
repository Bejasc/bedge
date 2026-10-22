import { AuditLogEvent } from 'discord.js';
import { quote } from './format.js';

export interface EditSnapshot {
  oldContent: string | null;
  newContent: string | null;
  oldEditedAt: number | null;
  newEditedAt: number | null;
}

/** Link unfurls and embed updates fire `messageUpdate` without an edit timestamp; only real edits count. */
export function isRealEdit(s: EditSnapshot): boolean {
  if (s.newEditedAt === null) return false;
  if (s.oldContent === null) return s.oldEditedAt !== s.newEditedAt;
  return s.oldContent !== s.newContent;
}

export const UNCACHED = '*Not cached — sent before the bot last restarted.*';

export function editBody(oldContent: string | null, newContent: string | null): string {
  const before = oldContent === null ? UNCACHED : oldContent ? quote(oldContent, 650) : '*empty*';
  const after = newContent ? quote(newContent, 650) : '*empty*';
  return `**Before**\n${before}\n**After**\n${after}`;
}

export interface MemberSnapshot {
  nickname: string | null;
  roleIds: string[];
}

export interface MemberDiff {
  nickname?: { before: string | null; after: string | null };
  addedRoles: string[];
  removedRoles: string[];
}

export function diffMember(before: MemberSnapshot, after: MemberSnapshot): MemberDiff {
  const diff: MemberDiff = {
    addedRoles: after.roleIds.filter((id) => !before.roleIds.includes(id)),
    removedRoles: before.roleIds.filter((id) => !after.roleIds.includes(id)),
  };
  if (before.nickname !== after.nickname) diff.nickname = { before: before.nickname, after: after.nickname };
  return diff;
}

export type VoiceLogKey = 'voice.join' | 'voice.leave' | 'voice.move';

export function classifyVoice(oldChannelId: string | null, newChannelId: string | null): VoiceLogKey | null {
  if (oldChannelId === newChannelId) return null;
  if (!oldChannelId) return 'voice.join';
  if (!newChannelId) return 'voice.leave';
  return 'voice.move';
}

/**
 * The invite whose use count went up between snapshots. A single-use invite is deleted the moment it's used,
 * so an invite that vanished counts when nothing else changed.
 */
export function findUsedInvite(before: Map<string, number>, after: Map<string, number>): string | null {
  const increased = [...after].filter(([code, uses]) => uses > (before.get(code) ?? 0)).map(([code]) => code);
  if (increased.length === 1) return increased[0];
  if (increased.length > 1) return null;
  const vanished = [...before.keys()].filter((code) => !after.has(code));
  return vanished.length === 1 ? vanished[0] : null;
}

export interface AuditChange {
  key: string;
  old?: unknown;
  new?: unknown;
}

export type ModLogKey = 'mod.kick' | 'mod.ban' | 'mod.unban' | 'mod.timeout' | 'mod.untimeout';

export interface ClassifiedAudit {
  key: ModLogKey;
  until?: Date;
}

export function classifyAuditEntry(action: AuditLogEvent, changes: readonly AuditChange[]): ClassifiedAudit | null {
  switch (action) {
    case AuditLogEvent.MemberKick:
      return { key: 'mod.kick' };
    case AuditLogEvent.MemberBanAdd:
      return { key: 'mod.ban' };
    case AuditLogEvent.MemberBanRemove:
      return { key: 'mod.unban' };
    case AuditLogEvent.MemberUpdate: {
      const timeout = changes.find((c) => c.key === 'communication_disabled_until');
      if (!timeout) return null;
      if (!timeout.new) return { key: 'mod.untimeout' };
      const until = new Date(String(timeout.new));
      return Number.isNaN(until.getTime()) ? null : { key: 'mod.timeout', until };
    }
    default:
      return null;
  }
}

/** Remembers keys for a window; `seen` is true when the key was already recorded inside it. */
export class RecentKeys {
  private readonly keys = new Map<string, number>();

  public constructor(private readonly windowMs: number) {}

  public seen(key: string, now = Date.now()): boolean {
    for (const [k, at] of this.keys) if (now - at > this.windowMs) this.keys.delete(k);
    if (this.keys.has(key)) return true;
    this.keys.set(key, now);
    return false;
  }
}
