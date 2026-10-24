import { describe, it, expect } from 'vitest';
import type { GuildConfig } from '@bedge/types';
import { resolveLogTarget, shouldMirror } from '../src/lib/logs/routing.js';
import { LIMITS, renderLog, renderMirror, renderTitle, truncate } from '../src/lib/logs/render.js';
import { getLogType } from '../src/lib/logs/log-types.js';

const enabled = { enabled: true };

function config(overrides: Partial<Pick<GuildConfig, 'defaultLogChannelId' | 'logs'>> = {}) {
  return {
    defaultLogChannelId: 'default',
    logs: { messages: enabled, members: enabled, moderation: enabled, voice: enabled, server: enabled },
    ...overrides,
  };
}

function textContent(json: unknown): string {
  return [...JSON.stringify(json).matchAll(/"content":"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join('');
}

describe('resolveLogTarget', () => {
  it('uses the category channel when set', () => {
    const c = config({ logs: { ...config().logs, messages: { enabled: true, channelId: 'msg' } } });
    expect(resolveLogTarget(c, 'messages')).toEqual({ kind: 'channel', channelId: 'msg' });
  });

  it('falls back to the default channel', () => {
    expect(resolveLogTarget(config(), 'voice')).toEqual({ kind: 'channel', channelId: 'default' });
  });

  it('skips when neither is set', () => {
    expect(resolveLogTarget(config({ defaultLogChannelId: undefined }), 'voice')).toEqual({
      kind: 'skip',
      reason: 'unconfigured',
    });
  });

  it('skips a disabled category even with a channel', () => {
    const c = config({ logs: { ...config().logs, server: { enabled: false, channelId: 'srv' } } });
    expect(resolveLogTarget(c, 'server')).toEqual({ kind: 'skip', reason: 'disabled' });
  });
});

describe('shouldMirror', () => {
  const admin = { guildId: 'admin', channelId: 'admin-log' };

  it('mirrors other guilds when the admin hub is configured', () => {
    expect(shouldMirror('other', admin)).toBe(true);
  });

  it('does not mirror the admin guild to itself', () => {
    expect(shouldMirror('admin', admin)).toBe(false);
  });

  it('does not mirror when the admin hub is unset', () => {
    expect(shouldMirror('other', {})).toBe(false);
    expect(shouldMirror('other', { guildId: 'admin' })).toBe(false);
  });
});

describe('truncate', () => {
  it('leaves short text untouched', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('cuts long text to the limit with a marker', () => {
    const out = truncate('x'.repeat(5000), LIMITS.body);
    expect(out.length).toBeLessThanOrEqual(LIMITS.body);
    expect(out.endsWith('*(truncated)*')).toBe(true);
  });
});

describe('renderLog', () => {
  const type = getLogType('test');

  it('titles the log with emoji, title and subject', () => {
    expect(renderTitle(type, { subject: { id: '1', label: 'ben' } })).toBe('🧪 Test log — ben');
  });

  it('keeps the whole message within the Components V2 text budget', () => {
    const payload = {
      subject: { id: '1', label: 'u'.repeat(500), avatarUrl: 'https://cdn.example/a.png' },
      body: 'b'.repeat(10_000),
      fields: Array.from({ length: 20 }, (_, i) => ({ name: `f${i}`, value: 'v'.repeat(2000) })),
      links: [{ label: 'Jump to message', url: 'https://discord.com/channels/1/2/3' }],
    };
    expect(textContent(renderLog(type, payload).components.map((c) => c.toJSON())).length).toBeLessThan(4000);
  });

  it('renders link buttons and the subject thumbnail', () => {
    const json = renderLog(type, {
      subject: { id: '1', label: 'ben', avatarUrl: 'https://cdn.example/a.png' },
      links: [{ label: 'Jump to message', url: 'https://discord.com/channels/1/2/3' }],
    }).components[0].toJSON();
    const s = JSON.stringify(json);
    expect(s).toContain('https://cdn.example/a.png');
    expect(s).toContain('Jump to message');
    expect(json.accent_color).toBe(type.accentColour);
  });
});

describe('renderMirror', () => {
  it('shows the source server and both jump buttons', () => {
    const s = JSON.stringify(
      renderMirror(
        getLogType('test'),
        { links: [{ label: 'Jump to message', url: 'https://discord.com/channels/1/2/3' }] },
        {
          guildName: 'SWRPG',
          guildIconUrl: 'https://cdn.example/icon.png',
          localLogUrl: 'https://discord.com/channels/1/9/9',
        },
      ).components[0].toJSON(),
    );
    expect(s).toContain('SWRPG');
    expect(s).toContain('https://cdn.example/icon.png');
    expect(s).toContain('Jump to source');
    expect(s).toContain('Jump to log');
  });
});
