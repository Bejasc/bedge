import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleConfigInteraction } from '../lib/config-actions.js';

export class ConfigPanelButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith('cfg:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction<'cached'>): Promise<void> {
    await handleConfigInteraction(interaction);
  }
}
