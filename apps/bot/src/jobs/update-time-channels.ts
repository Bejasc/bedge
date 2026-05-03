import { ChannelType, PermissionFlagsBits, type VoiceChannel } from 'discord.js';
import type { SapphireClient } from '@sapphire/framework';
import spacetime from 'spacetime';
import { TimeTrackConfigModel, AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityWindow } from '@bedge/types';
import { buildChannelName, currentTimeIn } from '../lib/time-channel.js';

type StoplightDot = '🟢' | '🟡' | '🟠' | '🔴';

const DOTS: Record<string, StoplightDot> = {
  green: '🟢',
  yellow: '🟡',
  orange: '🟠',
  red: '🔴',
};

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isInWindow(currentMinutes: number, window: AvailabilityWindow): boolean {
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  if (end < start) {
    // Overnight window: wraps past midnight
    return currentMinutes >= start || currentMinutes < end;
  }
  return currentMinutes >= start && currentMinutes < end;
}

export function computeStoplight(
  currentMinutes: number,
  currentDay: number,
  weekdays: Map<string, AvailabilityWindow[] | null> | Record<string, AvailabilityWindow[] | null>,
  broad: AvailabilityWindow[],
): StoplightDot {
  const weekdayWindows =
    weekdays instanceof Map
      ? weekdays.get(String(currentDay)) ?? null
      : weekdays[String(currentDay)] ?? null;

  const layer = weekdayWindows !== null ? weekdayWindows : broad;

  for (const window of layer ?? []) {
    if (isInWindow(currentMinutes, window)) {
      return DOTS[window.level] ?? '🔴';
    }
  }

  return '🔴';
}

export function createUpdateTimeChannelsJob(client: SapphireClient) {
  return async (): Promise<void> => {
    const configs = await TimeTrackConfigModel.find({});
    if (configs.length === 0) return;

    for (const config of configs) {
      try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const s = spacetime.now(config.timezone);
        const timeStr = currentTimeIn(config.timezone);
        const currentMinutes = s.hour() * 60 + s.minute();
        const currentDay = s.day();

        const avail = await AvailabilityConfigModel.findOne({
          guildId: config.guildId,
          memberId: config.memberId,
        });

        const dot = avail
          ? computeStoplight(currentMinutes, currentDay, avail.weekdays as any, avail.broad)
          : undefined;

        const targetName = buildChannelName(config.alias, timeStr, dot);

        let channel = config.channelId
          ? (guild.channels.cache.get(config.channelId) as VoiceChannel | undefined)
          : undefined;

        if (!channel) {
          // Channel missing — attempt to fetch, then recreate if still absent
          if (config.channelId) {
            try {
              channel = (await guild.channels.fetch(config.channelId)) as VoiceChannel | null ?? undefined;
            } catch {
              channel = undefined;
            }
          }

          if (!channel) {
            if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
              client.logger.warn(
                `update-time-channels: missing ManageChannels in guild ${guild.id} — cannot recreate channel for ${config.memberId}`,
              );
              continue;
            }

            channel = (await guild.channels.create({
              name: targetName,
              type: ChannelType.GuildVoice,
              parent: config.categoryId,
              permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
              ],
            })) as VoiceChannel;

            config.channelId = channel.id;
            await config.save();
            client.logger.info(
              `update-time-channels: recreated channel ${channel.id} for member ${config.memberId} in guild ${guild.id}`,
            );
            continue; // Name already set via create
          }
        }

        if (channel.name !== targetName) {
          await channel.setName(targetName).catch((err: unknown) => {
            client.logger.warn(
              `update-time-channels: failed to rename channel ${channel!.id} — ${String(err)}`,
            );
          });
        }
      } catch (err) {
        client.logger.error(
          `update-time-channels: error processing member ${config.memberId} in guild ${config.guildId}:`,
          err,
        );
      }
    }
  };
}
