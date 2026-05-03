import { Command } from '@sapphire/framework';
import { buildTrackSubcommand, handleTrack } from './track.js';
import { buildUntrackSubcommand, handleUntrack } from './untrack.js';

export class TimeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Timezone tracking commands' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('time')
        .setDescription('Timezone tracking commands')
        .addSubcommand(buildTrackSubcommand)
        .addSubcommand(buildUntrackSubcommand),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'track':
        return handleTrack(interaction);
      case 'untrack':
        return handleUntrack(interaction);
      default:
        await interaction.reply({ content: `Unknown subcommand: ${sub}`, ephemeral: true });
    }
  }
}
