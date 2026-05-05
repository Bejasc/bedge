import { ChatInputCommandErrorPayload, Events, Listener } from '@sapphire/framework';

export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ChatInputCommandError });
  }

  public async run(error: Error, { command, interaction }: ChatInputCommandErrorPayload): Promise<void> {
    const sub = interaction.options.getSubcommand(false);
    const fullCommand = sub ? `/${command.name} ${sub}` : `/${command.name}`;
    const user = `${interaction.user.username} (${interaction.user.id})`;
    const channelName = interaction.channel && 'name' in interaction.channel
      ? interaction.channel.name
      : 'unknown';
    const location = interaction.guild
      ? `#${channelName} in ${interaction.guild.name}`
      : 'DM';

    this.container.logger.error(`${fullCommand} failed — ${user} in ${location}`, error);

    const message = { content: '❌ Something went wrong. The error has been logged.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply(message);
    }
  }
}
