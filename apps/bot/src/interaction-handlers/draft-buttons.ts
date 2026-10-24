import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleDraftButton } from '../lib/posting/drafts.js';

export class DraftButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith('draft:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction<'cached'>): Promise<void> {
    await handleDraftButton(interaction);
  }
}
