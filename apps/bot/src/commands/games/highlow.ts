import { Command } from '@sapphire/framework';
import { usePlay } from '../../lib/games/play.js';
import { startHighLow } from '../../lib/games/sessions.js';

export class HighLowCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Guess higher or lower — build a run, cash out before you bust' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) => builder.setName('highlow').setDescription(this.description).setDMPermission(false));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const remaining = await usePlay(interaction, 'highlow');
    if (remaining === false) return;
    await interaction.reply(startHighLow(interaction.guildId, interaction.user.id, remaining));
  }
}
