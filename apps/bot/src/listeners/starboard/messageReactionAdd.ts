import { Events, Listener } from '@sapphire/framework';
import type { MessageReaction, PartialMessageReaction } from 'discord.js';
import { onStarReaction } from '../../lib/starboard/service.js';

export class StarboardMessageReactionAddListener extends Listener<typeof Events.MessageReactionAdd> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageReactionAdd });
  }

  public async run(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
    await onStarReaction(reaction);
  }
}
