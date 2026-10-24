import { Command } from '@sapphire/framework';
import { replyLookup } from '../../lib/moderation/interactions.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

export class LookupCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('mod'), description: 'Show a member’s profile and moderation history' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('lookup')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('mod'))
        .setDMPermission(false)
        .addUserOption((o) => o.setName('user').setDescription('Who to look up').setRequired(true)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await replyLookup(interaction, interaction.guildId!, interaction.options.getUser('user', true).id);
  }
}
