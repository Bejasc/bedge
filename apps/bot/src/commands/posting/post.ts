import { Command } from '@sapphire/framework';
import { PostTemplateModel } from '@bedge/database';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { postDraft } from '../../lib/posting/drafts.js';
import { personaAutocomplete, personaNames, templateAutocomplete } from '../../lib/posting/interactions.js';
import { postModal } from '../../lib/posting/modals.js';
import { POSTABLE_CHANNEL_TYPES } from '../../lib/posting/send.js';
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
        .addStringOption((o) => o.setName('template').setDescription('Start from a saved template').setAutocomplete(true))
        .addStringOption((o) => o.setName('code').setDescription('Post a draft from the embed builder').setMinLength(8).setMaxLength(8))
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Where to post a draft (default: here)').addChannelTypes(...POSTABLE_CHANNEL_TYPES),
        )
        .addStringOption((o) => o.setName('persona').setDescription('Post a draft as this persona').setAutocomplete(true)),
    );
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    if (interaction.options.getFocused(true).name === 'persona') await personaAutocomplete(interaction);
    else await templateAutocomplete(interaction);
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const code = interaction.options.getString('code');
    if (code) {
      const channelId = interaction.options.getChannel('channel')?.id ?? interaction.channelId;
      await postDraft(interaction, code, channelId, interaction.options.getString('persona'));
      return;
    }

    const templateName = interaction.options.getString('template');
    const template = templateName ? await PostTemplateModel.findOne({ guildId: interaction.guildId, name: templateName }) : null;
    if (templateName && !template) {
      await interaction.reply({ content: `❌ No template called **${templateName}**.`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(
      postModal({
        channelId: interaction.options.getChannel('channel')?.id ?? interaction.channelId,
        personas: await personaNames(interaction.guildId),
        format: template?.format ?? 'text',
        content: template?.content ?? '',
      }),
    );
  }
}
