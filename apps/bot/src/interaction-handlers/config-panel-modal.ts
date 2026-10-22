import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { handleConfigModal } from '../lib/config-actions.js';

export class ConfigPanelModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    return interaction.customId.startsWith('cfg:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
    await handleConfigModal(interaction);
  }
}
