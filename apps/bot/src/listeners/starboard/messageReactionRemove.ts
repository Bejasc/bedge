import { Events, Listener } from '@sapphire/framework';
import type { MessageReaction, PartialMessageReaction } from 'discord.js';
import { onStarReaction } from '../../lib/starboard/service.js';

export class StarboardMessageReactionRemoveListener extends Listener<typeof Events.MessageReactionRemove> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageReactionRemove });
  }

  public async run(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
    await onStarReaction(reaction);
  }
}
