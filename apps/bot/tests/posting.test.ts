import { describe, it, expect } from 'vitest';
import { ComponentType, MessageFlags } from 'discord.js';
import { buildPostPayload, cardComponents, hasV2Components, inferFormat } from '../src/lib/posting/payload.js';
import { editModal, postModal, templateModal } from '../src/lib/posting/modals.js';

describe('buildPostPayload', () => {
  it('posts trimmed text and rejects empty or oversized text', () => {
    expect(buildPostPayload('text', '  hi  ')).toEqual({ ok: true, payload: { content: 'hi' } });
    expect(buildPostPayload('text', '   ').ok).toBe(false);
    expect(buildPostPayload('text', 'x'.repeat(2001)).ok).toBe(false);
  });

  it('wraps cards in a V2 container', () => {
    const result = buildPostPayload('card', 'hello');
    expect(result).toEqual({ ok: true, payload: { components: cardComponents('hello'), flags: MessageFlags.IsComponentsV2 } });
  });

  it('accepts classic JSON payloads', () => {
    const result = buildPostPayload('json', JSON.stringify({ content: 'hi', embeds: [{ title: 'T' }] }));
    expect(result).toEqual({ ok: true, payload: { content: 'hi', embeds: [{ title: 'T' }] } });
  });

  it('sets the V2 flag for V2 components and rejects mixing with content', () => {
    const components = [{ type: ComponentType.Container, components: [{ type: ComponentType.TextDisplay, content: 'x' }] }];
    const ok = buildPostPayload('json', JSON.stringify({ components }));
    expect(ok.ok && ok.payload.flags).toBe(MessageFlags.IsComponentsV2);
    const mixed = buildPostPayload('json', JSON.stringify({ content: 'x', components }));
    expect(mixed.ok).toBe(false);
  });

  it('explains bad JSON and schema violations', () => {
    const bad = buildPostPayload('json', '{nope');
    expect(!bad.ok && bad.error).toMatch(/valid JSON/);
    const tooMany = buildPostPayload('json', JSON.stringify({ embeds: Array.from({ length: 11 }, () => ({})) }));
    expect(!tooMany.ok && tooMany.error).toMatch(/embeds/);
    const empty = buildPostPayload('json', '{}');
    expect(!empty.ok && empty.error).toMatch(/needs/);
  });
});

describe('hasV2Components', () => {
  it('finds V2 components nested in rows and accessories', () => {
    expect(hasV2Components([{ type: ComponentType.ActionRow, components: [{ type: ComponentType.Button }] }])).toBe(false);
    expect(hasV2Components([{ type: 1, components: [{ type: 2, accessory: null }] }])).toBe(false);
    expect(hasV2Components([{ type: 99, accessory: { type: ComponentType.Thumbnail } }])).toBe(true);
  });
});

describe('inferFormat', () => {
  it('reads plain messages as text', () => {
    expect(inferFormat({ content: 'hi', embeds: [], components: [], flags: 0 })).toEqual({ format: 'text', content: 'hi' });
  });

  it('round-trips cards', () => {
    expect(inferFormat({ content: '', embeds: [], components: cardComponents('hello'), flags: MessageFlags.IsComponentsV2 })).toEqual({
      format: 'card',
      content: 'hello',
    });
  });

  it('falls back to JSON for embeds and richer V2 layouts', () => {
    const embedded = inferFormat({ content: 'a', embeds: [{ title: 'T' }], components: [], flags: 0 });
    expect(embedded.format).toBe('json');
    expect(JSON.parse(embedded.content)).toEqual({ content: 'a', embeds: [{ title: 'T' }] });

    const v2 = [{ type: ComponentType.TextDisplay, content: 'a' }, { type: ComponentType.Separator }];
    const rich = inferFormat({ content: '', embeds: [], components: v2, flags: MessageFlags.IsComponentsV2 });
    expect(rich.format).toBe('json');
    expect(buildPostPayload('json', rich.content).ok).toBe(true);
  });
});

describe('modals', () => {
  it('build valid modal JSON', () => {
    expect(() => postModal({ channelId: '1', personas: Array.from({ length: 40 }, (_, i) => `p${i}`), format: 'card', content: 'x' }).toJSON()).not.toThrow();
    expect(() => editModal('1', '2', 'json', '{}').toJSON()).not.toThrow();
    expect(() => templateModal('', 'text', '').toJSON()).not.toThrow();
  });

  it('caps persona options at Discord’s 25', () => {
    const json = JSON.stringify(postModal({ channelId: '1', personas: Array.from({ length: 40 }, (_, i) => `p${i}`), format: 'text', content: '' }).toJSON());
    expect(json).toContain('"p23"');
    expect(json).not.toContain('"p24"');
  });
});
