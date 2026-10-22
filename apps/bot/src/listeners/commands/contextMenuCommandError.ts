import { ContextMenuCommandErrorPayload, Events, Listener } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

export class ContextMenuCommandErrorListener extends Listener<typeof Events.ContextMenuCommandError> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ContextMenuCommandError });
  }

  public async run(error: Error, { command, interaction }: ContextMenuCommandErrorPayload): Promise<void> {
    this.container.logger.error(`Context menu "${command.name}" failed — ${interaction.user.username} (${interaction.user.id})`, error);
    const message = { content: '❌ Something went wrong. The error has been logged.' };
    if (interaction.deferred || interaction.replied) await interaction.editReply(message);
    else await interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
  }
}
