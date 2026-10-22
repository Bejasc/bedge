import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags, type User } from 'discord.js';
import { giveRep } from '../../lib/games/service.js';

const MENU = 'Give rep';

/** `/rep` plus the *Give rep* user context menu (4 of 5 user slots with Plan 005's three). */
export class RepCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Give a member a point of rep (once a day)' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('rep')
        .setDescription(this.description)
        .setDMPermission(false)
        .addUserOption((o) => o.setName('user').setDescription('Who deserves it').setRequired(true)),
    );
    registry.registerContextMenuCommand((builder) => builder.setName(MENU).setType(ApplicationCommandType.User).setDMPermission(false));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    await this.rep(interaction, interaction.options.getUser('user', true));
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction): Promise<void> {
    if (interaction.isUserContextMenuCommand()) await this.rep(interaction, interaction.targetUser);
  }

  private async rep(interaction: Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction, target: User): Promise<void> {
    if (!interaction.guildId) return;
    if (target.bot || target.id === interaction.user.id) {
      await interaction.reply({ content: '❌ Rep goes to another member, not yourself or a bot.', flags: MessageFlags.Ephemeral });
      return;
    }
    const result = await giveRep(interaction.guildId, interaction.user.id, target.id);
    if (!result.ok) {
      const content =
        result.reason === 'disabled'
          ? 'Points are switched off in this server, so rep is too. An admin can turn them on in `/config` → *Games*.'
          : `You've already given rep today. You can again <t:${Math.floor(result.retryAt!.getTime() / 1000)}:R>.`;
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({
      content: `💖 <@${interaction.user.id}> gave <@${target.id}> rep! They now have **${result.total}**.`,
      allowedMentions: { users: [target.id] },
    });
  }
}
