import type { GuildConfig, LogCategory } from '@bedge/types';

export type LogTarget =
  | { kind: 'channel'; channelId: string }
  | { kind: 'skip'; reason: 'disabled' | 'unconfigured' };

export function resolveLogTarget(
  config: Pick<GuildConfig, 'defaultLogChannelId' | 'logs'>,
  category: LogCategory,
): LogTarget {
  const categoryConfig = config.logs[category];
  if (categoryConfig && categoryConfig.enabled === false) return { kind: 'skip', reason: 'disabled' };
  const channelId = categoryConfig?.channelId ?? config.defaultLogChannelId;
  return channelId ? { kind: 'channel', channelId } : { kind: 'skip', reason: 'unconfigured' };
}

export function shouldMirror(
  sourceGuildId: string,
  admin: { guildId?: string; channelId?: string },
): boolean {
  return Boolean(admin.guildId && admin.channelId && sourceGuildId !== admin.guildId);
}
