import { Events, Listener } from '@sapphire/framework';
import type { Message, PartialMessage } from 'discord.js';
import { onReactionsCleared } from '../../lib/starboard/service.js';

export class StarboardMessageReactionRemoveAllListener extends Listener<typeof Events.MessageReactionRemoveAll> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.MessageReactionRemoveAll });
  }

  public async run(message: Message | PartialMessage): Promise<void> {
    await onReactionsCleared(message);
  }
}
