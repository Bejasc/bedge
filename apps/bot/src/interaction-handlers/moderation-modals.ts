import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { handleModModal } from '../lib/moderation/interactions.js';

export class ModerationModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    return interaction.customId.startsWith('modmodal:') ? this.some() : this.none();
  }

  public async run(interaction: ModalSubmitInteraction): Promise<void> {
    await handleModModal(interaction);
  }
}
