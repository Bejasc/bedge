import { ContextMenuCommandDeniedPayload, Events, Listener, UserError } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

export class ContextMenuCommandDeniedListener extends Listener<typeof Events.ContextMenuCommandDenied> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ContextMenuCommandDenied });
  }

  public async run(error: UserError, { interaction }: ContextMenuCommandDeniedPayload): Promise<void> {
    this.container.logger.warn(`Context menu denied — ${interaction.user.username}: ${error.identifier}`);
    await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
  }
}
