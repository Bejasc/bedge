import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleBlackjack } from '../lib/games/blackjack-session.js';
import { handleDuel, handleHighLow } from '../lib/games/sessions.js';
import { handleTriviaAnswer } from '../lib/games/trivia-session.js';

export class GameButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return /^(hl|duel|bj|tv):/.test(interaction.customId) ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction): Promise<void> {
    const [kind] = interaction.customId.split(':');
    if (kind === 'hl') await handleHighLow(interaction);
    else if (kind === 'duel') await handleDuel(interaction);
    else if (kind === 'bj') await handleBlackjack(interaction);
    else await handleTriviaAnswer(interaction);
  }
}
