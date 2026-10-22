import { Command } from '@sapphire/framework';
import { PostTemplateModel } from '@bedge/database';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import { templateModal } from '../../lib/posting/modals.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';
import { templateAutocomplete } from '../../lib/posting/interactions.js';

const ephemeral = { flags: MessageFlags.Ephemeral } as const;

export class TemplateCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Manage saved post templates' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('template')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('admin'))
        .setDMPermission(false)
        .addSubcommand((s) =>
          s
            .setName('save')
            .setDescription('Write a new template (or overwrite one)')
            .addStringOption((o) => o.setName('name').setDescription('Template name').setRequired(true).setMaxLength(100).setAutocomplete(true)),
        )
        .addSubcommand((s) =>
          s
            .setName('delete')
            .setDescription('Delete a template')
            .addStringOption((o) => o.setName('name').setDescription('Template').setRequired(true).setAutocomplete(true)),
        )
        .addSubcommand((s) => s.setName('list').setDescription('List templates')),
    );
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    await templateAutocomplete(interaction);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const templates = await PostTemplateModel.find({ guildId }).sort({ name: 1 });
      const lines = templates.map((t) => `• **${t.name}** — ${t.format}, by <@${t.createdBy}>`);
      await interaction.reply({
        content: lines.length ? lines.join('\n') : 'No templates yet. Save one with `/template save` or *Save as template*.',
        allowedMentions: { parse: [] },
        ...ephemeral,
      });
      return;
    }

    const name = interaction.options.getString('name', true).trim();
    if (sub === 'save') {
      const existing = await PostTemplateModel.findOne({ guildId, name });
      await interaction.showModal(templateModal(name, existing?.format ?? 'text', existing?.content ?? ''));
      return;
    }

    const removed = await PostTemplateModel.findOneAndDelete({ guildId, name });
    if (!removed) {
      await interaction.reply({ content: `❌ No template called **${name}**.`, ...ephemeral });
      return;
    }
    await interaction.reply({ content: `🗑️ Template **${name}** deleted.`, ...ephemeral });
    await log(interaction.guild, 'server.config', { subject: subjectOf(interaction.member), body: `Template **${name}** deleted` });
  }
}
