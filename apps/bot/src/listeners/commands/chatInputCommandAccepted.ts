import { ChatInputCommandAcceptedPayload, Events, Listener } from '@sapphire/framework';

export class ChatInputCommandAcceptedListener extends Listener<typeof Events.ChatInputCommandAccepted> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ChatInputCommandAccepted });
  }

  public run({ command, interaction }: ChatInputCommandAcceptedPayload): void {
    const sub = interaction.options.getSubcommand(false);
    const fullCommand = sub ? `/${command.name} ${sub}` : `/${command.name}`;
    const user = `${interaction.user.username} (${interaction.user.id})`;
    const channelName = interaction.channel && 'name' in interaction.channel
      ? interaction.channel.name
      : 'unknown';
    const location = interaction.guild
      ? `#${channelName} in ${interaction.guild.name}`
      : 'DM';

    this.container.logger.info(`${fullCommand} — ${user} in ${location}`);
  }
}
