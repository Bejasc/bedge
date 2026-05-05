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
    // Interaction was created at this moment per Discord — anything before our
    // first await is in-process scheduling latency.
    const interactionCreatedAt = interaction.createdTimestamp;
    const handlerStart = Date.now();
    const scheduleLag = handlerStart - interactionCreatedAt;

    const beforeDefer = Date.now();
    await interaction.deferReply();
    const deferDuration = Date.now() - beforeDefer;

    const heartbeat = Math.round(this.container.client.ws.ping);
    const roundTrip = Date.now() - interactionCreatedAt;

    if (scheduleLag > 500 || deferDuration > 500) {
      this.container.logger.warn(
        `ping: scheduleLag=${scheduleLag}ms deferDuration=${deferDuration}ms heartbeat=${heartbeat}ms`,
      );
    }

    await interaction.editReply(
      `Pong! Round trip: \`${roundTrip}ms\` (schedule: \`${scheduleLag}ms\`, defer: \`${deferDuration}ms\`) | Heartbeat: \`${heartbeat}ms\``,
    );
  }
}
