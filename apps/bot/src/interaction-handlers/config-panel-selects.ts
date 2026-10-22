import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AnySelectMenuInteraction } from 'discord.js';
import { handleConfigInteraction } from '../lib/config-actions.js';

export class ConfigPanelSelectMenuHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.SelectMenu });
  }

  public override parse(interaction: AnySelectMenuInteraction) {
    return interaction.customId.startsWith('cfg:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: AnySelectMenuInteraction<'cached'>): Promise<void> {
    await handleConfigInteraction(interaction);
  }
}
