import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';
import { replyLookup, replyModeratePanel, showActionModalFor } from '../../lib/moderation/interactions.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

const MENUS = { note: 'Add note', lookup: 'Lookup', moderate: 'Moderate…' } as const;

/** The three user context menus (of Discord's five user slots); see Plan 005's budget. */
export class MemberMenuCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('mod'), description: 'Note, look up or moderate a member' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    for (const name of Object.values(MENUS)) {
      registry.registerContextMenuCommand((builder) =>
        builder
          .setName(name)
          .setType(ApplicationCommandType.User)
          .setDefaultMemberPermissions(defaultPermissionsFor('mod'))
          .setDMPermission(false),
      );
    }
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction): Promise<void> {
    if (!interaction.isUserContextMenuCommand() || !interaction.guildId) return;
    const userId = interaction.targetUser.id;
    switch (interaction.commandName) {
      case MENUS.note:
        return showActionModalFor(interaction, 'note', interaction.guildId, userId);
      case MENUS.lookup:
        return replyLookup(interaction, interaction.guildId, userId);
      case MENUS.moderate:
        return replyModeratePanel(interaction, interaction.guildId, userId);
    }
  }
}
