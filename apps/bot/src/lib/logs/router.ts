import { container } from '@sapphire/framework';
import type { Guild, Message, SendableChannels } from 'discord.js';
import { config } from '../../config.js';
import { getGuildConfig } from '../guild-config.js';
import { getLogType } from './log-types.js';
import { renderLog, renderMirror } from './render.js';
import { resolveLogTarget, shouldMirror } from './routing.js';
import type { LogPayload, MirrorSource } from './types.js';

async function fetchSendable(guild: Guild, channelId: string): Promise<SendableChannels | null> {
  const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  return channel?.isSendable() ? channel : null;
}

async function sendAdmin(typeKey: string, payload: LogPayload, source: MirrorSource): Promise<Message | null> {
  if (!config.adminGuildId || !config.adminLogChannelId) return null;
  const adminGuild = container.client.guilds.cache.get(config.adminGuildId);
  if (!adminGuild) {
    container.logger.warn(`log-router: admin guild ${config.adminGuildId} is not available`);
    return null;
  }
  const channel = await fetchSendable(adminGuild, config.adminLogChannelId);
  if (!channel) {
    container.logger.warn(`log-router: admin log channel ${config.adminLogChannelId} is missing or not sendable`);
    return null;
  }
  return channel.send(renderMirror(getLogType(typeKey), payload, source));
}

function mirrorSource(guild: Guild, localLogUrl?: string): MirrorSource {
  return { guildName: guild.name, guildIconUrl: guild.iconURL() ?? undefined, localLogUrl };
}

export interface LogResult {
  local: Message | null;
  mirror: Message | null;
}

/**
 * Posts a log to the guild's configured channel for the type's category, then ghost-mirrors it to the admin
 * channel. A disabled or unconfigured category skips only the local copy. Never throws.
 */
export async function log(guild: Guild, typeKey: string, payload: LogPayload): Promise<LogResult> {
  const result: LogResult = { local: null, mirror: null };
  try {
    const type = getLogType(typeKey);
    const guildConfig = await getGuildConfig(guild.id);
    const target = resolveLogTarget(guildConfig, type.category);

    if (target.kind === 'channel') {
      const channel = await fetchSendable(guild, target.channelId);
      if (channel) {
        result.local = await channel.send(renderLog(type, payload));
      } else {
        container.logger.warn(`log-router: ${typeKey} channel ${target.channelId} in ${guild.id} is missing or not sendable`);
      }
    }

    if (shouldMirror(guild.id, { guildId: config.adminGuildId, channelId: config.adminLogChannelId })) {
      result.mirror = await sendAdmin(typeKey, payload, mirrorSource(guild, result.local?.url));
    }
  } catch (error) {
    container.logger.error(`log-router: failed to post ${typeKey} for guild ${guild.id}`, error instanceof Error ? error : new Error(String(error)));
  }
  return result;
}

/** Posts straight to the admin channel, for events that have no local log (bot joined or left a server). */
export async function logToAdmin(guild: Guild, typeKey: string, payload: LogPayload): Promise<Message | null> {
  try {
    return await sendAdmin(typeKey, payload, mirrorSource(guild));
  } catch (error) {
    container.logger.error(`log-router: failed to post ${typeKey} to admin`, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
