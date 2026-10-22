import { describe, it, expect } from 'vitest';
import { AuditLogEvent } from 'discord.js';
import {
  RecentKeys,
  UNCACHED,
  classifyAuditEntry,
  classifyVoice,
  diffMember,
  editBody,
  findUsedInvite,
  isRealEdit,
} from '../src/lib/events/diffs.js';
import { formatDuration, quote } from '../src/lib/events/format.js';

describe('isRealEdit', () => {
  const base = { oldContent: 'a', newContent: 'b', oldEditedAt: null, newEditedAt: 1000 };

  it('logs a changed message', () => {
    expect(isRealEdit(base)).toBe(true);
  });

  it('ignores updates without an edit timestamp (link unfurls)', () => {
    expect(isRealEdit({ ...base, newEditedAt: null })).toBe(false);
  });

  it('ignores updates where the content did not change', () => {
    expect(isRealEdit({ ...base, newContent: 'a' })).toBe(false);
  });

  it('logs an uncached edit when the edit timestamp moved', () => {
    expect(isRealEdit({ ...base, oldContent: null })).toBe(true);
  });
});

describe('editBody', () => {
  it('quotes before and after', () => {
    expect(editBody('old', 'new')).toBe('**Before**\n> old\n**After**\n> new');
  });

  it('marks uncached content', () => {
    expect(editBody(null, 'new')).toContain(UNCACHED);
  });
});

describe('diffMember', () => {
  it('finds nickname and role changes', () => {
    const diff = diffMember({ nickname: 'a', roleIds: ['1', '2'] }, { nickname: 'b', roleIds: ['2', '3'] });
    expect(diff).toEqual({ nickname: { before: 'a', after: 'b' }, addedRoles: ['3'], removedRoles: ['1'] });
  });

  it('reports nothing when unchanged', () => {
    expect(diffMember({ nickname: null, roleIds: ['1'] }, { nickname: null, roleIds: ['1'] })).toEqual({
      addedRoles: [],
      removedRoles: [],
    });
  });
});

describe('classifyVoice', () => {
  it('classifies join, leave and move', () => {
    expect(classifyVoice(null, 'a')).toBe('voice.join');
    expect(classifyVoice('a', null)).toBe('voice.leave');
    expect(classifyVoice('a', 'b')).toBe('voice.move');
  });

  it('ignores mute and deafen updates in the same channel', () => {
    expect(classifyVoice('a', 'a')).toBeNull();
  });
});

describe('findUsedInvite', () => {
  it('finds the invite whose uses went up', () => {
    expect(findUsedInvite(new Map([['x', 1], ['y', 4]]), new Map([['x', 1], ['y', 5]]))).toBe('y');
  });

  it('counts a brand-new invite with one use', () => {
    expect(findUsedInvite(new Map([['x', 1]]), new Map([['x', 1], ['z', 1]]))).toBe('z');
  });

  it('falls back to a single vanished invite (single-use)', () => {
    expect(findUsedInvite(new Map([['x', 1], ['once', 0]]), new Map([['x', 1]]))).toBe('once');
  });

  it('gives up when ambiguous', () => {
    expect(findUsedInvite(new Map([['x', 1], ['y', 1]]), new Map([['x', 2], ['y', 2]]))).toBeNull();
    expect(findUsedInvite(new Map([['x', 1]]), new Map([['x', 1]]))).toBeNull();
  });
});

describe('classifyAuditEntry', () => {
  it('maps kicks, bans and unbans', () => {
    expect(classifyAuditEntry(AuditLogEvent.MemberKick, [])).toEqual({ key: 'mod.kick' });
    expect(classifyAuditEntry(AuditLogEvent.MemberBanAdd, [])).toEqual({ key: 'mod.ban' });
    expect(classifyAuditEntry(AuditLogEvent.MemberBanRemove, [])).toEqual({ key: 'mod.unban' });
  });

  it('maps timeout set and removed', () => {
    const until = '2030-01-01T00:00:00.000Z';
    expect(
      classifyAuditEntry(AuditLogEvent.MemberUpdate, [{ key: 'communication_disabled_until', new: until }]),
    ).toEqual({ key: 'mod.timeout', until: new Date(until) });
    expect(
      classifyAuditEntry(AuditLogEvent.MemberUpdate, [{ key: 'communication_disabled_until', old: until }]),
    ).toEqual({ key: 'mod.untimeout' });
  });

  it('ignores other member updates and other actions', () => {
    expect(classifyAuditEntry(AuditLogEvent.MemberUpdate, [{ key: 'nick', new: 'x' }])).toBeNull();
    expect(classifyAuditEntry(AuditLogEvent.ChannelCreate, [])).toBeNull();
  });
});

describe('RecentKeys', () => {
  it('dedupes within the window and forgets after it', () => {
    const recent = new RecentKeys(1000);
    expect(recent.seen('a', 0)).toBe(false);
    expect(recent.seen('a', 500)).toBe(true);
    expect(recent.seen('a', 2000)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('shows the two most significant units', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(65_000)).toBe('1m 5s');
    expect(formatDuration((2 * 365 + 14) * 86_400_000 + 3_600_000)).toBe('2y 14d');
    expect(formatDuration(86_400_000 + 30_000)).toBe('1d');
  });
});

describe('quote', () => {
  it('quotes every line and clips long text', () => {
    expect(quote('a\nb', 100)).toBe('> a\n> b');
    expect(quote('x'.repeat(50), 10)).toBe(`> ${'x'.repeat(9)}…`);
  });
});
