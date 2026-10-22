import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags, type Message } from 'discord.js';
import { MODAL_CONTENT_MAX, editModal, templateModal } from '../../lib/posting/modals.js';
import { inferFormat } from '../../lib/posting/payload.js';
import { isEditable } from '../../lib/posting/send.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

const MENUS = { edit: 'Edit bot message', template: 'Save as template' } as const;

function editableContent(message: Message) {
  return inferFormat({
    content: message.content,
    embeds: message.embeds.map((e) => e.toJSON() as Record<string, unknown>),
    components: message.components.map((c) => c.toJSON() as unknown as Record<string, unknown>),
    flags: message.flags.bitfield,
  });
}

/** Two of Discord's five message context-menu slots; see Plan 006's budget. */
export class PostingMenuCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Edit a bot post or save a message as a template' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    for (const name of Object.values(MENUS)) {
      registry.registerContextMenuCommand((builder) =>
        builder
          .setName(name)
          .setType(ApplicationCommandType.Message)
          .setDefaultMemberPermissions(defaultPermissionsFor('admin'))
          .setDMPermission(false),
      );
    }
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction): Promise<void> {
    if (!interaction.isMessageContextMenuCommand()) return;
    const message = interaction.targetMessage;
    const { format, content } = editableContent(message);

    if (content.length > MODAL_CONTENT_MAX) {
      await interaction.reply({
        content: `❌ That message is ${content.length} characters as ${format}, over the ${MODAL_CONTENT_MAX} a modal can hold. Use *Open in builder* instead.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === MENUS.template) {
      await interaction.showModal(templateModal('', format, content));
      return;
    }

    if (!isEditable(message)) {
      await interaction.reply({ content: '❌ I can only edit messages I sent, directly or as a persona.', flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.showModal(editModal(message.channelId, message.id, format, content));
  }
}
