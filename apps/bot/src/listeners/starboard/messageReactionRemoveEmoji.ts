import { Events, Listener } from '@sapphire/framework';
import type { MessageReaction, PartialMessageReaction } from 'discord.js';
import { onStarReaction } from '../../lib/starboard/service.js';

export class StarboardMessageReactionRemoveEmojiListener extends Listener<typeof Events.MessageReactionRemoveEmoji> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageReactionRemoveEmoji });
  }

  public async run(reaction: MessageReaction | PartialMessageReaction): Promise<void> {
    await onStarReaction(reaction);
  }
}
