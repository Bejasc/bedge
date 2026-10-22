import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { editableContent, openInBuilder } from '../../lib/posting/drafts.js';
import { MODAL_CONTENT_MAX, editModal, templateModal } from '../../lib/posting/modals.js';
import { isEditable } from '../../lib/posting/send.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

const MENUS = { edit: 'Edit bot message', template: 'Save as template', builder: 'Open in builder' } as const;

/** Three of Discord's five message context-menu slots; see Plans 006 and 007. */
export class PostingMenuCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Edit a bot post, save it as a template, or open it in the builder' });
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
    if (!interaction.isMessageContextMenuCommand() || !interaction.inCachedGuild()) return;
    const message = interaction.targetMessage;

    if (interaction.commandName === MENUS.builder) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const draft = await openInBuilder(message);
      if (!draft) return void (await interaction.editReply('❌ I couldn’t turn that message into a draft.'));
      const where = draft.link ? `Open it here: ${draft.link}` : `Load code \`${draft.code}\` in the builder (BUILDER_URL isn’t configured).`;
      const next = draft.linked
        ? `When you’re done, save and run \`/post code:<new code>\` → *Update original*.`
        : `This message isn’t mine, so the draft is a copy — post it with \`/post code:\`.`;
      await interaction.editReply(`🧰 Draft \`${draft.code}\` created. ${where}\n${next}`);
      return;
    }

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
