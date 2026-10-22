import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { describeFilters, selectForPurge, type PurgeFilters } from '../../lib/events/purge.js';
import { suppressBulkDeleteLog } from '../../lib/events/suppress.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

export class PurgeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('mod'), description: 'Bulk delete recent messages, with filters' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('purge')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('mod'))
        .setDMPermission(false)
        .addIntegerOption((o) =>
          o.setName('amount').setDescription('How many matching messages to delete (1–100)').setMinValue(1).setMaxValue(100).setRequired(true),
        )
        .addUserOption((o) => o.setName('user').setDescription('Only messages from this user'))
        .addStringOption((o) => o.setName('contains').setDescription('Only messages containing this text'))
        .addBooleanOption((o) => o.setName('bots').setDescription('Only messages from bots'))
        .addBooleanOption((o) => o.setName('attachments').setDescription('Only messages with attachments'))
        .addBooleanOption((o) => o.setName('links').setDescription('Only messages with links')),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.channel;
    if (!interaction.inCachedGuild() || !channel || !('bulkDelete' in channel)) {
      await interaction.reply({ content: '❌ Purge only works in server text channels.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const filters: PurgeFilters = {
      amount: interaction.options.getInteger('amount', true),
      userId: interaction.options.getUser('user')?.id,
      contains: interaction.options.getString('contains') ?? undefined,
      bots: interaction.options.getBoolean('bots') ?? undefined,
      attachments: interaction.options.getBoolean('attachments') ?? undefined,
      links: interaction.options.getBoolean('links') ?? undefined,
    };

    const fetched = await channel.messages.fetch({ limit: 100 });
    const ids = selectForPurge(
      [...fetched.values()].map((m) => ({
        id: m.id,
        authorId: m.author.id,
        authorBot: m.author.bot,
        content: m.content,
        hasAttachments: m.attachments.size > 0,
        pinned: m.pinned,
        createdTimestamp: m.createdTimestamp,
      })),
      filters,
    );

    if (ids.length === 0) {
      await interaction.editReply('Nothing matched those filters in the last 100 messages.');
      return;
    }

    suppressBulkDeleteLog(channel.id);
    const deleted = await channel.bulkDelete(ids, true);

    await log(interaction.guild, 'mod.purge', {
      subject: subjectOf(interaction.member),
      fields: [
        { name: 'Channel', value: `<#${channel.id}>` },
        { name: 'Deleted', value: String(deleted.size) },
        { name: 'Filters', value: describeFilters(filters) },
      ],
      links: [{ label: 'Jump to channel', url: channel.url }],
    });
    await interaction.editReply(`🧹 Deleted ${deleted.size} message(s).`);
  }
}
