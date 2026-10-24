import { Command } from '@sapphire/framework';
import { startBlackjack } from '../../lib/games/blackjack-session.js';
import { usePlay } from '../../lib/games/play.js';

export class BlackjackCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Play a hand of blackjack against the dealer' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) => builder.setName('blackjack').setDescription(this.description).setDMPermission(false));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const remaining = await usePlay(interaction, 'blackjack');
    if (remaining === false) return;
    await interaction.reply(await startBlackjack(interaction.guildId, interaction.user.id, remaining));
  }
}
