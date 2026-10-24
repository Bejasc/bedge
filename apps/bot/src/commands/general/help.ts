import { Command } from '@sapphire/framework';
import { groupHelp, namesOnly, renderHelp, type HelpEntry } from '../../lib/help.js';
import { tierOf } from '../../lib/tier-check.js';

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'List the commands you can use' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) => builder.setName('help').setDescription(this.description));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const entries: HelpEntry[] = [...this.container.stores.get('commands').values()].map((command) => ({
      name: command.name,
      description: command.description,
      category: command.category ?? 'general',
      tier: command.options.tier ?? 'none',
      slashNames: namesOnly(command.applicationCommandRegistry.chatInputCommands),
      contextMenuNames: namesOnly(command.applicationCommandRegistry.contextMenuCommands),
    }));
    const tier = await tierOf(interaction);
    await interaction.reply(renderHelp(groupHelp(entries, tier), tier));
  }
}
