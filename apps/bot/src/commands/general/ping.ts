import { Command } from '@sapphire/framework';

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Check bot latency' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder.setName('ping').setDescription('Check bot latency')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const heartbeat = Math.round(this.container.client.ws.ping);

    await interaction.editReply(
      `Pong! Round trip: \`${roundTrip}ms\` | Heartbeat: \`${heartbeat}ms\``
    );
  }
}
