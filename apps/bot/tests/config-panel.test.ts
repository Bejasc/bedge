import { describe, it, expect } from 'vitest';
import { configId, describeCategory, parseConfigId, renderConfigPanel } from '../src/lib/config-panel.js';
import type { GuildConfigData } from '../src/lib/guild-config.js';

const enabled = { enabled: true };
const base: GuildConfigData = {
  guildId: 'g',
  logs: { messages: enabled, members: enabled, moderation: enabled, voice: enabled, server: enabled },
  roles: {},
  welcome: { enabled: false },
  starboard: { enabled: false, emoji: '⭐', threshold: 3, selfStar: false },
  games: { pointsEnabled: false, dailyLimits: { coinflip: 0, highlow: 0, dice: 0 } },
};

describe('config panel custom IDs', () => {
  it('round-trips the view', () => {
    const id = configId('toggle', { section: 'logging', category: 'voice' });
    expect(parseConfigId(id)).toEqual({ action: 'toggle', view: { section: 'logging', category: 'voice' } });
  });

  it('rejects foreign IDs and defaults unknown parts', () => {
    expect(parseConfigId('other:thing')).toBeNull();
    expect(parseConfigId('cfg:test:nope:nope')).toEqual({
      action: 'test',
      view: { section: 'logging', category: 'messages' },
    });
  });
});

function countComponents(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n: number, child) => n + countComponents(child), 0);
  if (!node || typeof node !== 'object') return 0;
  const obj = node as Record<string, unknown>;
  const self = typeof obj.type === 'number' ? 1 : 0;
  return self + countComponents(obj.components) + countComponents(obj.accessory);
}

describe('renderConfigPanel', () => {
  it.each(['logging', 'roles', 'welcome', 'starboard', 'games'] as const)('renders the %s section within the 40-component limit', (section) => {
    const json = renderConfigPanel(base, 'Test', { section, category: 'voice' }).components.map((c) => c.toJSON());
    expect(countComponents(json)).toBeLessThanOrEqual(40);
  });
});

describe('describeCategory', () => {
  it('describes each routing state', () => {
    expect(describeCategory(base, 'voice')).toContain('no channel');
    expect(describeCategory({ ...base, defaultLogChannelId: 'd' }, 'voice')).toContain('(default)');
    expect(describeCategory({ ...base, logs: { ...base.logs, voice: { enabled: true, channelId: 'v' } } }, 'voice')).toContain('<#v>');
    expect(describeCategory({ ...base, logs: { ...base.logs, voice: { enabled: false } } }, 'voice')).toContain('disabled');
  });
});
