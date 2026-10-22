import { Command } from '@sapphire/framework';
import { MessageFlags, type SlashCommandIntegerOption } from 'discord.js';
import { discordTime } from '../../lib/events/format.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import { deleteCase, getCase, updateCaseReason } from '../../lib/moderation/cases.js';
import { CASE_LABELS } from '../../lib/moderation/rules.js';
import { tierAtLeast } from '../../lib/permissions.js';
import { defaultPermissionsFor, tierOf, tiered } from '../../lib/tier-check.js';

export class CaseCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('mod'), description: 'View, edit or delete a moderation case' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    const number = (o: SlashCommandIntegerOption) =>
      o.setName('number').setDescription('Case number').setRequired(true).setMinValue(1);
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('case')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('mod'))
        .setDMPermission(false)
        .addSubcommand((s) => s.setName('view').setDescription('Show a case').addIntegerOption(number))
        .addSubcommand((s) =>
          s
            .setName('reason')
            .setDescription('Change a case’s reason')
            .addIntegerOption(number)
            .addStringOption((o) => o.setName('reason').setDescription('New reason').setRequired(true).setMaxLength(1000)),
        )
        .addSubcommand((s) => s.setName('delete').setDescription('Delete a case (admin)').addIntegerOption(number)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const caseNumber = interaction.options.getInteger('number', true);
    const ephemeral = { flags: MessageFlags.Ephemeral } as const;

    if (sub === 'view') {
      const c = await getCase(interaction.guildId, caseNumber);
      if (!c) return void (await interaction.reply({ content: `❌ No case #${caseNumber} in this server.`, ...ephemeral }));
      const { emoji, label } = CASE_LABELS[c.type];
      const lines = [
        `### ${emoji} Case #${c.caseNumber} — ${label}`,
        `**Member:** <@${c.targetId}> (\`${c.targetId}\`)`,
        `**Moderator:** <@${c.moderatorId}>`,
        `**When:** ${discordTime(c.createdAt)}`,
        `**Reason:** ${c.reason}`,
      ];
      if (c.expiresAt) lines.push(`**Until:** ${discordTime(c.expiresAt)}`);
      if (c.logUrl) lines.push(`[Jump to log](${c.logUrl})`);
      await interaction.reply({ content: lines.join('\n'), allowedMentions: { parse: [] }, ...ephemeral });
      return;
    }

    if (sub === 'reason') {
      const reason = interaction.options.getString('reason', true);
      const c = await updateCaseReason(interaction.guildId, caseNumber, reason);
      if (!c) return void (await interaction.reply({ content: `❌ No case #${caseNumber} in this server.`, ...ephemeral }));
      await interaction.reply({ content: `✏️ Case #${caseNumber} updated.`, ...ephemeral });
      await log(interaction.guild, 'case.update', {
        subject: subjectOf(interaction.member),
        fields: [
          { name: 'Case', value: `#${caseNumber} (${CASE_LABELS[c.type].label} on <@${c.targetId}>)` },
          { name: 'New reason', value: reason },
        ],
        links: c.logUrl ? [{ label: 'Original log', url: c.logUrl }] : [],
      });
      return;
    }

    if (!tierAtLeast(await tierOf(interaction), 'admin')) {
      await interaction.reply({ content: '❌ Deleting cases needs the **Admin** tier.', ...ephemeral });
      return;
    }
    const c = await deleteCase(interaction.guildId, caseNumber);
    if (!c) return void (await interaction.reply({ content: `❌ No case #${caseNumber} in this server.`, ...ephemeral }));
    await interaction.reply({ content: `🗑️ Case #${caseNumber} deleted.`, ...ephemeral });
    await log(interaction.guild, 'case.delete', {
      subject: subjectOf(interaction.member),
      fields: [
        { name: 'Case', value: `#${caseNumber} (${CASE_LABELS[c.type].label} on <@${c.targetId}>)` },
        { name: 'Reason was', value: c.reason },
      ],
    });
  }
}
