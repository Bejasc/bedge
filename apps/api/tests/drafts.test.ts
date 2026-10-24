import { describe, it, expect } from 'vitest';
import { CODE_ALPHABET, CODE_LENGTH, generateDraftCode, normaliseDraftCode } from '@bedge/database';
import { RateLimiter } from '../src/drafts/rate-limit.js';
import { clientKey, parseDraftBody } from '../src/drafts/drafts.controller.js';

describe('generateDraftCode', () => {
  it('produces 8 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateDraftCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });

  it('never uses look-alike characters', () => {
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('uses the injected random source', () => {
    expect(generateDraftCode(() => 0)).toBe('AAAAAAAA');
  });
});

describe('normaliseDraftCode', () => {
  it('upper-cases and trims valid codes', () => {
    expect(normaliseDraftCode(' abcd2345 ')).toBe('ABCD2345');
  });

  it('rejects wrong length and look-alikes', () => {
    expect(normaliseDraftCode('ABC')).toBeNull();
    expect(normaliseDraftCode('ABCD0123')).toBeNull();
    expect(normaliseDraftCode('../../etc')).toBeNull();
  });
});

describe('RateLimiter', () => {
  it('allows up to the limit per window, per key', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 10)).toBe(true);
    expect(limiter.allow('a', 20)).toBe(false);
    expect(limiter.allow('b', 20)).toBe(true);
    expect(limiter.allow('a', 1000)).toBe(true);
  });
});

describe('parseDraftBody', () => {
  it('accepts a payload with an optional source', () => {
    const body = { payload: { content: 'hi' }, source: { guildId: '1', channelId: '2', messageId: '3' } };
    expect(parseDraftBody(body)).toEqual({ ok: true, data: body });
  });

  it('reports schema problems with paths', () => {
    const result = parseDraftBody({ payload: { content: 'x'.repeat(2001) } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues[0]).toMatch(/^payload\.content/);
    expect(parseDraftBody('nope').ok).toBe(false);
  });
});

describe('clientKey', () => {
  it('prefers the Cloudflare client header over the proxy address', () => {
    expect(clientKey({ ip: '127.0.0.1', headers: { 'cf-connecting-ip': '203.0.113.7' } })).toBe('203.0.113.7');
    expect(clientKey({ ip: '198.51.100.2', headers: {} })).toBe('198.51.100.2');
    expect(clientKey({ headers: {} })).toBe('unknown');
  });
});
