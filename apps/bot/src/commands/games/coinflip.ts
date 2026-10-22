import { Command } from '@sapphire/framework';
import { flipCoin, type Coin } from '../../lib/games/logic.js';
import { usePlay } from '../../lib/games/play.js';
import { OUTCOME_COLOUR, footerLine, gameCard } from '../../lib/games/render.js';
import { awardPoints, recordOutcome } from '../../lib/games/service.js';

const FACE: Record<Coin, string> = { heads: '🪙 **Heads**', tails: '🪙 **Tails**' };

export class CoinflipCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Flip a coin — call it to play for your streak' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('coinflip')
        .setDescription(this.description)
        .setDMPermission(false)
        .addStringOption((o) =>
          o.setName('call').setDescription('Heads or tails (leave empty to just flip)').addChoices(
            { name: 'Heads', value: 'heads' },
            { name: 'Tails', value: 'tails' },
          ),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const call = interaction.options.getString('call') as Coin | null;
    if (!call) {
      await interaction.reply(gameCard([`### Coin flip`, FACE[flipCoin()]]));
      return;
    }

    const remaining = await usePlay(interaction, 'coinflip');
    if (remaining === false) return;
    const result = flipCoin();
    const outcome = result === call ? 'win' : 'loss';
    const stats = await recordOutcome(interaction.guildId, interaction.user.id, 'coinflip', outcome);
    const points = outcome === 'win' ? await awardPoints(interaction.guildId, interaction.user.id, 1) : 0;
    await interaction.reply(
      gameCard(
        [
          `### Coin flip — <@${interaction.user.id}> called ${call}`,
          FACE[result],
          outcome === 'win' ? `✅ You win! Streak: **${stats.currentStreak}**` : `❌ You lose. Best streak: **${stats.bestStreak}**`,
          footerLine([points ? `+${points} point` : null, remaining]),
        ].filter(Boolean),
        OUTCOME_COLOUR[outcome],
      ),
    );
  }
}
