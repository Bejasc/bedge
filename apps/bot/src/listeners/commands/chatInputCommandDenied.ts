import { ChatInputCommandDeniedPayload, Events, Listener, UserError } from '@sapphire/framework';

export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ChatInputCommandDenied });
  }

  public async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload): Promise<void> {
    this.container.logger.warn(`Command denied — ${interaction.user.username}: ${error.identifier}`);

    await interaction.reply({
      content: `❌ ${error.message}`,
      ephemeral: true,
    });
  }
}
