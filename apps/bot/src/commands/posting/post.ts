import { Command } from '@sapphire/framework';
import { PostTemplateModel } from '@bedge/database';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { postModal } from '../../lib/posting/modals.js';
import { personaNames, templateAutocomplete } from '../../lib/posting/interactions.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

export class PostCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Post a message as the bot or a persona' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('post')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('admin'))
        .setDMPermission(false)
        .addStringOption((o) => o.setName('template').setDescription('Start from a saved template').setAutocomplete(true)),
    );
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    await templateAutocomplete(interaction);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const templateName = interaction.options.getString('template');
    const template = templateName ? await PostTemplateModel.findOne({ guildId: interaction.guildId, name: templateName }) : null;
    if (templateName && !template) {
      await interaction.reply({ content: `❌ No template called **${templateName}**.`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(
      postModal({
        channelId: interaction.channelId,
        personas: await personaNames(interaction.guildId),
        format: template?.format ?? 'text',
        content: template?.content ?? '',
      }),
    );
  }
}
