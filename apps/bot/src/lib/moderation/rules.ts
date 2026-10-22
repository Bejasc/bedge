import type { ModCaseType } from '@bedge/types';
import { TIER_RANK, type Tier } from '../permissions.js';

export const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses `30s`, `10m`, `2h`, `7d` and combinations like `1d 12h`. Returns null for invalid or zero input. */
export function parseModDuration(input: string): number | null {
  const normalized = input.replace(/\s+/g, '').toLowerCase();
  if (!/^(\d+[smhd])+$/.test(normalized)) return null;
  let total = 0;
  for (const [, n, unit] of normalized.matchAll(/(\d+)([smhd])/g)) total += Number(n) * UNIT_MS[unit];
  return total > 0 ? total : null;
}

export const ACTION_TIER: Record<ModCaseType, Exclude<Tier, 'none' | 'owner'>> = {
  note: 'mod',
  warn: 'mod',
  timeout: 'mod',
  untimeout: 'mod',
  kick: 'admin',
  ban: 'admin',
  unban: 'admin',
};

export const CASE_LABELS: Record<ModCaseType, { emoji: string; label: string; past: string }> = {
  note: { emoji: '📝', label: 'Note', past: 'noted' },
  warn: { emoji: '⚠️', label: 'Warn', past: 'warned' },
  timeout: { emoji: '⏳', label: 'Timeout', past: 'timed out' },
  untimeout: { emoji: '⌛', label: 'Timeout removed', past: 'released from timeout' },
  kick: { emoji: '👢', label: 'Kick', past: 'kicked' },
  ban: { emoji: '🔨', label: 'Ban', past: 'banned' },
  unban: { emoji: '🕊️', label: 'Unban', past: 'unbanned' },
};

export const CASE_LOG_KEY: Record<ModCaseType, string> = {
  note: 'case.note',
  warn: 'case.warn',
  timeout: 'mod.timeout',
  untimeout: 'mod.untimeout',
  kick: 'mod.kick',
  ban: 'mod.ban',
  unban: 'mod.unban',
};

export interface TargetCheck {
  actorId: string;
  actorTier: Tier;
  targetId: string;
  /** Null when the target isn't a member of the server (e.g. banning by ID). */
  targetTier: Tier | null;
  botId: string;
}

/** Returns why the actor may not act on the target, or null when they may. */
export function checkTarget(c: TargetCheck): string | null {
  if (c.targetId === c.actorId) return "You can't moderate yourself.";
  if (c.targetId === c.botId) return "I can't moderate myself.";
  if (c.targetTier === 'owner') return "The bot owner can't be moderated.";
  if (c.targetTier && c.actorTier !== 'owner' && TIER_RANK[c.targetTier] >= TIER_RANK[c.actorTier]) {
    return 'That member has the same or a higher tier than you.';
  }
  return null;
}

/** The DM sent to a member before or after an action; notes are never sent. */
export function dmText(type: ModCaseType, guildName: string, reason: string, until?: Date): string | null {
  if (type === 'note' || type === 'untimeout' || type === 'unban') return null;
  const untilText = until ? ` until <t:${Math.floor(until.getTime() / 1000)}:f>` : '';
  return `You were **${CASE_LABELS[type].past}** in **${guildName}**${untilText}.\n**Reason:** ${reason}`;
}

export function formatCaseLine(c: { caseNumber: number; type: ModCaseType; reason: string; createdAt: Date; moderatorId: string }): string {
  const { emoji, label } = CASE_LABELS[c.type];
  const reason = c.reason.length > 80 ? `${c.reason.slice(0, 79)}…` : c.reason;
  return `\`#${c.caseNumber}\` ${emoji} **${label}** <t:${Math.floor(c.createdAt.getTime() / 1000)}:d> by <@${c.moderatorId}> — ${reason}`;
}
