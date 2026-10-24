import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { handleEventModal } from '../lib/guild-events/interactions.js';

export class EventModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    return /^evt[ce]:/.test(interaction.customId) && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
    await handleEventModal(interaction);
  }
}
