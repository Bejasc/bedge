import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { handlePostModal } from '../lib/posting/interactions.js';

export class PostModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    return interaction.customId.startsWith('post:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
    await handlePostModal(interaction);
  }
}
