import { describe, it, expect } from 'vitest';
import type { User } from 'discord.js';
import { modButtonId, modalId, parseModButtonId, parseModalId } from '../src/lib/moderation/buttons.js';
import { consumePending, markPending } from '../src/lib/moderation/pending.js';
import { actionButtons, actionModal } from '../src/lib/moderation/panels.js';
import { MAX_TIMEOUT_MS, checkTarget, dmText, formatCaseLine, parseModDuration } from '../src/lib/moderation/rules.js';

describe('parseModDuration', () => {
  it('parses single and combined units', () => {
    expect(parseModDuration('30s')).toBe(30_000);
    expect(parseModDuration('10m')).toBe(600_000);
    expect(parseModDuration('1d 12h')).toBe(36 * 3_600_000);
    expect(parseModDuration('28d')).toBe(MAX_TIMEOUT_MS);
  });

  it('rejects junk and zero', () => {
    expect(parseModDuration('soon')).toBeNull();
    expect(parseModDuration('10')).toBeNull();
    expect(parseModDuration('0m')).toBeNull();
    expect(parseModDuration('')).toBeNull();
  });
});

describe('checkTarget', () => {
  const base = { actorId: 'a', actorTier: 'mod' as const, targetId: 't', targetTier: 'none' as const, botId: 'bot' };

  it('allows acting on a lower tier', () => {
    expect(checkTarget(base)).toBeNull();
  });

  it('blocks self, the bot and the owner', () => {
    expect(checkTarget({ ...base, targetId: 'a' })).toMatch(/yourself/);
    expect(checkTarget({ ...base, targetId: 'bot' })).toMatch(/myself/);
    expect(checkTarget({ ...base, targetTier: 'owner' })).toMatch(/owner/);
  });

  it('blocks equal or higher tiers, except for the owner', () => {
    expect(checkTarget({ ...base, targetTier: 'mod' })).toMatch(/higher tier/);
    expect(checkTarget({ ...base, targetTier: 'admin' })).toMatch(/higher tier/);
    expect(checkTarget({ ...base, actorTier: 'admin', targetTier: 'mod' })).toBeNull();
    expect(checkTarget({ ...base, actorTier: 'owner', targetTier: 'admin' })).toBeNull();
  });

  it('allows non-members (ban by ID)', () => {
    expect(checkTarget({ ...base, targetTier: null })).toBeNull();
  });
});

describe('dmText', () => {
  it('never DMs notes, unbans or timeout removals', () => {
    expect(dmText('note', 'S', 'r')).toBeNull();
    expect(dmText('unban', 'S', 'r')).toBeNull();
    expect(dmText('untimeout', 'S', 'r')).toBeNull();
  });

  it('names the server, the action and the reason', () => {
    expect(dmText('warn', 'SWRPG', 'spam')).toBe('You were **warned** in **SWRPG**.\n**Reason:** spam');
    expect(dmText('timeout', 'SWRPG', 'spam', new Date(1_000_000))).toContain('until <t:1000:f>');
  });
});

describe('formatCaseLine', () => {
  it('formats and clips the reason', () => {
    const line = formatCaseLine({ caseNumber: 7, type: 'ban', reason: 'x'.repeat(200), createdAt: new Date(0), moderatorId: 'm' });
    expect(line.startsWith('`#7` 🔨 **Ban** <t:0:d> by <@m> — ')).toBe(true);
    expect(line.endsWith('…')).toBe(true);
  });
});

describe('custom IDs', () => {
  it('round-trips button and modal IDs', () => {
    expect(parseModButtonId(modButtonId('warn', 'g', 'u'))).toEqual({ action: 'warn', guildId: 'g', userId: 'u' });
    expect(parseModalId(modalId('ban', 'g', 'u'))).toEqual({ type: 'ban', guildId: 'g', userId: 'u' });
    expect(parseModButtonId('cfg:x:y:z')).toBeNull();
    expect(parseModalId('mod:warn:g:u')).toBeNull();
  });
});

describe('pending markers', () => {
  it('are consumed once', () => {
    markPending('g', 'u', 'ban');
    expect(consumePending('g', 'u', 'ban')).toBe(true);
    expect(consumePending('g', 'u', 'ban')).toBe(false);
    expect(consumePending('g', 'u', 'kick')).toBe(false);
  });
});

describe('panels', () => {
  const user = { id: '42', username: 'ben', displayAvatarURL: () => 'https://cdn.example/a.png' } as unknown as User;

  it('offers mods note, warn and timeout but not kick or ban', () => {
    const labels = actionButtons('g', '42', 'mod').toJSON().components.map((c) => ('label' in c ? c.label : ''));
    expect(labels).toEqual(['Note', 'Warn', 'Timeout']);
    expect(actionButtons('g', '42', 'admin').components).toHaveLength(5);
  });

  it.each(['note', 'warn', 'timeout', 'kick', 'ban'] as const)('builds a valid %s modal', (type) => {
    expect(() => actionModal(type, 'g', user).toJSON()).not.toThrow();
  });
});
