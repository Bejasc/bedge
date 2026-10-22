import { Command } from '@sapphire/framework';
import { renderProfile } from '../../lib/games/render.js';
import { gamesConfig, profile } from '../../lib/games/service.js';

export class StatsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Points, rep and game stats for you or another member' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('stats')
        .setDescription(this.description)
        .setDMPermission(false)
        .addUserOption((o) => o.setName('user').setDescription('Whose stats (default: yours)')),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const user = interaction.options.getUser('user') ?? interaction.user;
    const [data, config] = await Promise.all([profile(interaction.guildId, user.id), gamesConfig(interaction.guildId)]);
    await interaction.reply(
      renderProfile({
        userId: user.id,
        username: user.username,
        points: data.points,
        rep: data.rep,
        pointsEnabled: config.pointsEnabled,
        stats: data.stats,
      }),
    );
  }
}
