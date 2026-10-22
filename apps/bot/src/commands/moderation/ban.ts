import type { Command } from '@sapphire/framework';
import { ModActionCommand } from '../../lib/moderation/action-command.js';

export class BanCommand extends ModActionCommand {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, options, 'ban');
  }
}
