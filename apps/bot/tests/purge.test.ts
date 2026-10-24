import { describe, it, expect } from 'vitest';
import { BULK_DELETE_MAX_AGE_MS, describeFilters, selectForPurge, type PurgeCandidate } from '../src/lib/events/purge.js';

const NOW = 1_000_000_000_000;

function msg(id: string, overrides: Partial<PurgeCandidate> = {}): PurgeCandidate {
  return {
    id,
    authorId: 'u1',
    authorBot: false,
    content: 'hello',
    hasAttachments: false,
    pinned: false,
    createdTimestamp: NOW - 1000,
    ...overrides,
  };
}

describe('selectForPurge', () => {
  it('takes the newest N matches', () => {
    expect(selectForPurge([msg('1'), msg('2'), msg('3')], { amount: 2 }, NOW)).toEqual(['1', '2']);
  });

  it('filters by user, text, bots, attachments and links', () => {
    const list = [
      msg('a', { authorId: 'u2' }),
      msg('b', { content: 'Buy NOW' }),
      msg('c', { authorBot: true }),
      msg('d', { hasAttachments: true }),
      msg('e', { content: 'see https://example.com' }),
    ];
    expect(selectForPurge(list, { amount: 100, userId: 'u2' }, NOW)).toEqual(['a']);
    expect(selectForPurge(list, { amount: 100, contains: 'now' }, NOW)).toEqual(['b']);
    expect(selectForPurge(list, { amount: 100, bots: true }, NOW)).toEqual(['c']);
    expect(selectForPurge(list, { amount: 100, attachments: true }, NOW)).toEqual(['d']);
    expect(selectForPurge(list, { amount: 100, links: true }, NOW)).toEqual(['e']);
  });

  it('keeps pinned messages and ones too old to bulk delete', () => {
    const list = [msg('pinned', { pinned: true }), msg('old', { createdTimestamp: NOW - BULK_DELETE_MAX_AGE_MS - 1 }), msg('ok')];
    expect(selectForPurge(list, { amount: 100 }, NOW)).toEqual(['ok']);
  });
});

describe('describeFilters', () => {
  it('summarises the filters', () => {
    expect(describeFilters({ amount: 5 })).toBe('any');
    expect(describeFilters({ amount: 5, userId: '9', links: true })).toBe('from <@9>, with links');
  });
});
