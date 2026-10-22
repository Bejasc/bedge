import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleDuel, handleHighLow } from '../lib/games/sessions.js';

export class GameButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return /^(hl|duel):/.test(interaction.customId) ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction): Promise<void> {
    if (interaction.customId.startsWith('hl:')) await handleHighLow(interaction);
    else await handleDuel(interaction);
  }
}
