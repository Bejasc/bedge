import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleModButton } from '../lib/moderation/interactions.js';

export class ModerationButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith('mod:') ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction): Promise<void> {
    await handleModButton(interaction);
  }
}
