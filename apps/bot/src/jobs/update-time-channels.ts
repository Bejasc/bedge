import { CategoryChannel, ChannelType, PermissionFlagsBits, type VoiceChannel } from 'discord.js';
import type { SapphireClient } from '@sapphire/framework';
import spacetime from 'spacetime';
import { TimeTrackConfigModel, AvailabilityConfigModel } from '@bedge/database';
import { buildChannelName, buildChannelPermissions, currentTimeIn } from '../lib/time-channel.js';
import { computeLevel, levelToStoplightDot } from '../lib/availability.js';

export async function updateMemberTimeChannel(
  client: SapphireClient,
  guildId: string,
  memberId: string,
): Promise<void> {
  const config = await TimeTrackConfigModel.findOne({ guildId, memberId });
  if (!config) {
    client.logger.debug(`update-member-channel: no track config for member=${memberId} guild=${guildId}`);
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    client.logger.debug(`update-member-channel: guild ${guildId} not in cache`);
    return;
  }

  const s = spacetime.now(config.timezone);
  const timeStr = currentTimeIn(config.timezone);
  const currentMinutes = s.hour() * 60 + s.minute();
  const currentDay = s.day();

  const avail = await AvailabilityConfigModel.findOne({ guildId, memberId });
  const level = computeLevel(currentMinutes, currentDay, avail ?? null);
  const dot = levelToStoplightDot(level);

  client.logger.debug(
    `update-member-channel: member=${memberId} minutes=${currentMinutes} day=${currentDay} → ${level} ${dot}` +
    (avail?.override?.expiresAt ? ` (override until ${avail.override.expiresAt.toISOString()})` : ''),
  );

  const targetName = buildChannelName(config.alias, timeStr, dot);

  let channel = config.channelId
    ? (guild.channels.cache.get(config.channelId) as VoiceChannel | undefined)
    : undefined;

  if (!channel && config.channelId) {
    try {
      channel = (await guild.channels.fetch(config.channelId)) as VoiceChannel | null ?? undefined;
    } catch {
      channel = undefined;
    }
  }

  if (!channel) {
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      client.logger.warn(
        `update-member-channel: missing ManageChannels in guild ${guildId} — cannot recreate channel for ${memberId}`,
      );
      return;
    }

    const categoryChannel = guild.channels.cache.get(config.categoryId) as CategoryChannel | undefined;
    const permissionOverwrites = categoryChannel
      ? buildChannelPermissions(categoryChannel, guild.roles.everyone.id)
      : [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }];

    channel = (await guild.channels.create({
      name: targetName,
      type: ChannelType.GuildVoice,
      parent: config.categoryId,
      permissionOverwrites,
    })) as VoiceChannel;

    config.channelId = channel.id;
    await config.save();
    client.logger.info(
      `update-member-channel: recreated channel ${channel.id} for member=${memberId} guild=${guildId}`,
    );
    return; // name already set via create
  }

  if (channel.name !== targetName) {
    // Fire-and-forget — don't hold the cron loop hostage if discord.js queues
    // the rename behind a rate-limit bucket.
    void channel.setName(targetName).catch((err: unknown) => {
      client.logger.warn(`update-member-channel: failed to rename channel ${channel!.id} — ${String(err)}`);
    });
  }
}

export function createUpdateTimeChannelsJob(client: SapphireClient) {
  return async (): Promise<void> => {
    const configs = await TimeTrackConfigModel.find({});
    client.logger.debug(`update-time-channels: processing ${configs.length} tracked member(s)`);
    if (configs.length === 0) return;

    for (const config of configs) {
      try {
        await updateMemberTimeChannel(client, config.guildId, config.memberId);
      } catch (err) {
        client.logger.error(
          `update-time-channels: failed for member ${config.memberId} in guild ${config.guildId}`,
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
  };
}
