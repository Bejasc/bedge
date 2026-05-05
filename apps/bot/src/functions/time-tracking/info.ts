import { EmbedBuilder, type SlashCommandSubcommandBuilder } from 'discord.js';
import type { Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import spacetime from 'spacetime';
import { TimeTrackConfigModel, AvailabilityConfigModel } from '@bedge/database';
import type { AvailabilityLevel } from '@bedge/types';
import { computeLevel, LEVEL_LABELS, LEVEL_COLORS } from '../../lib/availability.js';

export function buildInfoSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .setName('info')
    .setDescription('Show current time and availability for a tracked member')
    .addUserOption((o) =>
      o.setName('member').setDescription('The tracked member to query').setRequired(true),
    );
}

export async function handleInfo(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const targetUser = interaction.options.getUser('member', true);
  const guildId = interaction.guildId!;

  const config = await TimeTrackConfigModel.findOne({ guildId, memberId: targetUser.id });
  if (!config) {
    await interaction.editReply(
      `<@${targetUser.id}> is not currently tracked. Ask a server admin to run \`/time track\` first.`,
    );
    return;
  }

  const s = spacetime.now(config.timezone);
  const meta = s.timezone();
  const off = meta.current.offset;
  const sign = off >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(off));
  const m = Math.round((Math.abs(off) - h) * 60);
  const offsetStr = m > 0 ? `UTC${sign}${h}:${m.toString().padStart(2, '0')}` : `UTC${sign}${h}`;

  const localTime = s.format('time-24') as string;
  const localDate = s.format('nice') as string;
  const currentMinutes = s.hour() * 60 + s.minute();
  const currentDay = s.day();

  const avail = await AvailabilityConfigModel.findOne({ guildId, memberId: targetUser.id });

  container.logger.debug(
    `info: member=${targetUser.id} tz=${config.timezone} minutes=${currentMinutes} day=${currentDay} hasConfig=${!!avail}`,
  );

  const level = computeLevel(currentMinutes, currentDay, avail ?? null);

  const hasActiveOverride = avail?.override && avail.override.expiresAt > new Date();
  container.logger.debug(
    `info: member=${targetUser.id} computed level=${level}` +
    (hasActiveOverride ? ` (override until ${avail!.override!.expiresAt.toISOString()})` : ''),
  );

  const guildMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
  const displayName = guildMember?.displayName ?? targetUser.username;

  let availabilityText = LEVEL_LABELS[level as AvailabilityLevel] ?? LEVEL_LABELS['red'];
  if (hasActiveOverride) {
    const expiresUnix = Math.floor(avail!.override!.expiresAt.getTime() / 1000);
    availabilityText += ` *(override until <t:${expiresUnix}:t>)*`;
  } else if (!avail) {
    availabilityText += ' *(default)*';
  }

  const embed = new EmbedBuilder()
    .setColor(LEVEL_COLORS[level as AvailabilityLevel] ?? LEVEL_COLORS['red'])
    .setAuthor({ name: displayName, iconURL: targetUser.displayAvatarURL() })
    .addFields(
      { name: 'Local Time', value: localTime, inline: true },
      { name: 'Date', value: localDate, inline: true },
      { name: '​', value: '​', inline: true },
      { name: 'Timezone', value: meta.display || config.timezone, inline: true },
      { name: 'Offset', value: offsetStr, inline: true },
      { name: 'Availability', value: availabilityText, inline: true },
    );

  if (interaction.user.id !== targetUser.id) {
    const invokerConfig = await TimeTrackConfigModel.findOne({
      guildId,
      memberId: interaction.user.id,
    });
    if (invokerConfig) {
      const invokerS = spacetime.now(invokerConfig.timezone);
      embed.addFields({
        name: `Your time (${invokerConfig.alias})`,
        value: invokerS.format('time-24') as string,
        inline: false,
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
