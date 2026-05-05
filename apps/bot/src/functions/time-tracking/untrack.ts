import { PermissionFlagsBits, type SlashCommandSubcommandBuilder } from 'discord.js';
import type { Command } from '@sapphire/framework';
import { TimeTrackConfigModel } from '@bedge/database';

export function buildUntrackSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .setName('untrack')
    .setDescription('Stop tracking a member\'s timezone and remove their voice channel')
    .addUserOption((o) =>
      o.setName('member').setDescription('The member to untrack').setRequired(true),
    );
}

export async function handleUntrack(interaction: Command.ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: '❌ You need the **Manage Server** permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const member = interaction.options.getUser('member', true);

  const config = await TimeTrackConfigModel.findOne({ guildId: guild.id, memberId: member.id });
  if (!config) {
    await interaction.editReply(`No tracking config found for <@${member.id}>.`);
    return;
  }

  if (config.channelId) {
    try {
      const channel = await guild.channels.fetch(config.channelId);
      if (channel) await channel.delete('Timezone tracking removed');
    } catch {
      // Channel already gone — proceed with config removal
    }
  }

  await TimeTrackConfigModel.deleteOne({ _id: config._id });

  await interaction.editReply(`✅ Stopped tracking <@${member.id}> and removed their voice channel.`);
}
