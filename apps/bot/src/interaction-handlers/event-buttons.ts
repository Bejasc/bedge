import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { handleManage, handleRsvp } from '../lib/guild-events/interactions.js';

export class EventButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  public override parse(interaction: ButtonInteraction) {
    return /^evtm?:/.test(interaction.customId) && interaction.inCachedGuild() ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction<'cached'>): Promise<void> {
    if (interaction.customId.startsWith('evt:rsvp:')) await handleRsvp(interaction);
    else await handleManage(interaction);
  }
}
