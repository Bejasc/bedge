import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type SlashCommandSubcommandBuilder,
  type VoiceChannel,
} from 'discord.js';
import type { Command } from '@sapphire/framework';
import { TimeTrackConfigModel } from '@bedge/database';
import { parseTimezone } from '../../lib/timezone.js';
import { buildChannelName, currentTimeIn } from '../../lib/time-channel.js';

export function buildTrackSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .setName('track')
    .setDescription('Start tracking a member\'s timezone with an auto-updating voice channel')
    .addUserOption((o) =>
      o.setName('member').setDescription('The member to track').setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('zone')
        .setDescription('Timezone — IANA (America/New_York), abbreviation (CST), or offset (UTC+9:30)')
        .setRequired(true),
    )
    .addChannelOption((o) =>
      o
        .setName('category')
        .setDescription('Category to place the voice channel in')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('alias').setDescription('Short name shown in the channel (e.g. "Ben")').setRequired(true),
    );
}

export async function handleTrack(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the **Manage Server** permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  const guild = interaction.guild!;
  const member = interaction.options.getUser('member', true);
  const zone = interaction.options.getString('zone', true);
  const category = interaction.options.getChannel('category', true);
  const alias = interaction.options.getString('alias', true);

  const parsed = parseTimezone(zone);
  if (!parsed) {
    await interaction.reply({
      content: `❌ Could not parse timezone \`${zone}\`. Try an IANA name like \`Australia/Sydney\`, an abbreviation like \`CST\`, or an offset like \`UTC+9:30\`.`,
      ephemeral: true,
    });
    return;
  }

  const confirmEmbed = new EmbedBuilder()
    .setTitle('Confirm Timezone Tracking')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Member', value: `<@${member.id}>`, inline: true },
      { name: 'Alias', value: alias, inline: true },
      { name: '​', value: '​', inline: true },
      { name: 'Timezone', value: parsed.displayName, inline: true },
      { name: 'IANA Zone', value: `\`${parsed.ianaZone}\``, inline: true },
      { name: 'Current Offset', value: parsed.currentOffset, inline: true },
      { name: 'Category', value: `<#${category.id}>`, inline: true },
    )
    .setFooter({ text: 'This confirmation expires in 30 seconds' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('tt-confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tt-cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
  );

  await interaction.deferReply({ ephemeral: true });
  const msg = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  try {
    const btn = await msg.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
    });

    if (btn.customId === 'tt-cancel') {
      await btn.update({ content: 'Cancelled.', embeds: [], components: [] });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await btn.update({
        content: '❌ I need the **Manage Channels** permission to create voice channels.',
        embeds: [],
        components: [],
      });
      return;
    }

    const channel = (await guild.channels.create({
      name: buildChannelName(alias, '--:--'),
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
      ],
    })) as VoiceChannel;

    await TimeTrackConfigModel.create({
      guildId: guild.id,
      memberId: member.id,
      timezone: parsed.ianaZone,
      categoryId: category.id,
      channelId: channel.id,
      alias,
    });

    // Immediate name update — don't wait for the next cron tick
    const timeStr = currentTimeIn(parsed.ianaZone);
    await channel.setName(buildChannelName(alias, timeStr));

    await btn.update({
      content: `✅ Now tracking <@${member.id}> (\`${parsed.ianaZone}\`). Voice channel created.`,
      embeds: [],
      components: [],
    });
  } catch {
    await interaction.editReply({ content: '⏱️ Confirmation timed out.', components: [] });
  }
}
