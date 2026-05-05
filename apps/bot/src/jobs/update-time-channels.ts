import { ChannelType, PermissionFlagsBits, type VoiceChannel } from 'discord.js';
import type { SapphireClient } from '@sapphire/framework';
import spacetime from 'spacetime';
import { TimeTrackConfigModel, AvailabilityConfigModel } from '@bedge/database';
import { buildChannelName, currentTimeIn } from '../lib/time-channel.js';
import { computeLevel, levelToStoplightDot } from '../lib/availability.js';

export function createUpdateTimeChannelsJob(client: SapphireClient) {
  return async (): Promise<void> => {
    const configs = await TimeTrackConfigModel.find({});
    client.logger.debug(`update-time-channels: processing ${configs.length} tracked member(s)`);
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

        const level = computeLevel(currentMinutes, currentDay, avail ?? null);
        const dot = levelToStoplightDot(level);

        client.logger.debug(
          `update-time-channels: member=${config.memberId} tz=${config.timezone} minutes=${currentMinutes} day=${currentDay} → ${level} ${dot}` +
          (avail?.override?.expiresAt ? ` (override until ${avail.override.expiresAt.toISOString()})` : ' (no override)'),
        );

        const targetName = buildChannelName(config.alias, timeStr, dot);

        let channel = config.channelId
          ? (guild.channels.cache.get(config.channelId) as VoiceChannel | undefined)
          : undefined;

        if (!channel) {
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
            continue;
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
          `update-time-channels: failed for member ${config.memberId} in guild ${config.guildId}`,
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
  };
}
