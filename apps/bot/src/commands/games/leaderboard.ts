import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { renderLeaderboard } from '../../lib/games/render.js';
import { BOARD_LABELS, gamesConfig, leaderboard, type Board } from '../../lib/games/service.js';

export class LeaderboardCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Top members for points, rep or a game' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('leaderboard')
        .setDescription(this.description)
        .setDMPermission(false)
        .addStringOption((o) =>
          o
            .setName('board')
            .setDescription('Which leaderboard')
            .setRequired(true)
            .addChoices(...(Object.keys(BOARD_LABELS) as Board[]).map((b) => ({ name: BOARD_LABELS[b].title.replace(/^\S+ /, ''), value: b }))),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const board = interaction.options.getString('board', true) as Board;
    if ((board === 'points' || board === 'rep') && !(await gamesConfig(interaction.guildId)).pointsEnabled) {
      await interaction.reply({ content: 'Points and rep are switched off in this server.', flags: MessageFlags.Ephemeral });
      return;
    }
    const rows = await leaderboard(interaction.guildId, board);
    await interaction.reply(renderLeaderboard(board, rows, interaction.user.id, interaction.guild.name));
  }
}
