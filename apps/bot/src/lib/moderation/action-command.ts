import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import type { ModCaseType } from '@bedge/types';
import { defaultPermissionsFor, tierOf, tiered } from '../tier-check.js';
import { performModAction } from './actions.js';
import { describeResult } from './interactions.js';
import { DELETE_MESSAGE_CHOICES } from './panels.js';
import { ACTION_TIER, parseModDuration } from './rules.js';

const DESCRIPTIONS: Partial<Record<ModCaseType, string>> = {
  note: 'Add a private note to a member’s history',
  warn: 'Warn a member (DMs them and opens a case)',
  timeout: 'Time out a member',
  untimeout: 'Remove a member’s timeout',
  kick: 'Kick a member',
  ban: 'Ban a user, member or not',
  unban: 'Unban a user',
};

/** `/note`, `/warn`, `/timeout`, `/untimeout`, `/kick`, `/ban` and `/unban` differ only in their case type. */
export abstract class ModActionCommand extends Command {
  private readonly caseType: ModCaseType;

  protected constructor(context: Command.LoaderContext, options: Command.Options, caseType: ModCaseType) {
    super(context, { ...options, ...tiered(ACTION_TIER[caseType]), description: DESCRIPTIONS[caseType] });
    this.caseType = caseType;
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    const type = this.caseType;
    registry.registerChatInputCommand((builder) => {
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor(ACTION_TIER[type]))
        .setDMPermission(false)
        .addUserOption((o) => o.setName('user').setDescription('Who this applies to').setRequired(true));
      if (type === 'timeout') {
        builder.addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 2h, 7d (max 28d)').setRequired(true));
      }
      builder.addStringOption((o) =>
        o.setName('reason').setDescription(type === 'note' ? 'The note' : 'Why').setRequired(true).setMaxLength(1000),
      );
      if (type === 'ban') {
        builder.addStringOption((o) =>
          o
            .setName('delete_messages')
            .setDescription('Delete their recent messages')
            .addChoices(...DELETE_MESSAGE_CHOICES.map((c) => ({ name: c.label, value: c.value }))),
        );
      }
      return builder;
    });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const type = this.caseType;
    const target = interaction.options.getUser('user', true);

    let durationMs: number | undefined;
    if (type === 'timeout') {
      durationMs = parseModDuration(interaction.options.getString('duration', true)) ?? undefined;
      if (!durationMs) {
        await interaction.reply({ content: '❌ Invalid duration. Use formats like `10m`, `2h` or `7d`.', flags: MessageFlags.Ephemeral });
        return;
      }
    }

    const ephemeral = type === 'note';
    await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});
    const result = await performModAction({
      guild: interaction.guild,
      type,
      targetId: target.id,
      moderator: interaction.user,
      actorTier: await tierOf(interaction),
      reason: interaction.options.getString('reason', true),
      durationMs,
      deleteMessageSeconds: Number(interaction.options.getString('delete_messages') ?? 0),
    });

    if (!result.ok && !ephemeral) {
      await interaction.deleteReply();
      await interaction.followUp({ content: describeResult(result, type, target.id), flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.editReply({ content: describeResult(result, type, target.id), allowedMentions: { parse: [] } });
  }
}
