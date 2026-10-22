import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AnySelectMenuInteraction } from 'discord.js';
import { handleManage } from '../lib/guild-events/interactions.js';

export class EventSelectHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.SelectMenu });
  }

  public override parse(interaction: AnySelectMenuInteraction) {
    return interaction.customId.startsWith('evtm:') && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: AnySelectMenuInteraction<'cached'>): Promise<void> {
    await handleManage(interaction);
  }
}
