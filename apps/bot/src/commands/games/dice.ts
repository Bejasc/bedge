import { Command } from '@sapphire/framework';
import { MessageFlags, type SlashCommandIntegerOption } from 'discord.js';
import { compareRolls, rollDice } from '../../lib/games/logic.js';
import { usePlay } from '../../lib/games/play.js';
import { OUTCOME_COLOUR, footerLine, gameCard } from '../../lib/games/render.js';
import { awardPoints, recordOutcome } from '../../lib/games/service.js';
import { createDuel } from '../../lib/games/sessions.js';

const SIDES = [4, 6, 8, 10, 12, 20, 100];

export class DiceCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Dice games against the bot or another member' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    const sides = (o: SlashCommandIntegerOption) =>
      o.setName('sides').setDescription('Die size (default d6)').addChoices(...SIDES.map((n) => ({ name: `d${n}`, value: n })));
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('dice')
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((s) => s.setName('bot').setDescription('Roll against the bot — higher wins').addIntegerOption(sides))
        .addSubcommand((s) =>
          s
            .setName('duel')
            .setDescription('Challenge a member — higher roll wins')
            .addUserOption((o) => o.setName('opponent').setDescription('Who to challenge').setRequired(true))
            .addIntegerOption(sides),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const sides = interaction.options.getInteger('sides') ?? 6;

    if (interaction.options.getSubcommand() === 'duel') {
      const opponent = interaction.options.getUser('opponent', true);
      if (opponent.bot || opponent.id === interaction.user.id) {
        await interaction.reply({ content: '❌ Challenge another member — use `/dice bot` to play the bot.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({
        ...createDuel({ guildId: interaction.guildId, challengerId: interaction.user.id, opponentId: opponent.id, sides }),
        allowedMentions: { users: [opponent.id] },
      });
      return;
    }

    const remaining = await usePlay(interaction, 'dice');
    if (remaining === false) return;
    const spec = { count: 1, sides, modifier: 0 };
    const mine = rollDice(spec).total;
    const theirs = rollDice(spec).total;
    const outcome = compareRolls(mine, theirs);
    await recordOutcome(interaction.guildId, interaction.user.id, 'dice', outcome);
    const points = outcome === 'win' ? await awardPoints(interaction.guildId, interaction.user.id, 1) : 0;
    const verdict = { win: '✅ You win!', loss: '❌ The bot wins.', draw: '🤝 A draw.' }[outcome];
    await interaction.reply(
      gameCard(
        [
          `### 🎲 d${sides} vs the bot`,
          `<@${interaction.user.id}> rolled **${mine}** · BedgeBot rolled **${theirs}**`,
          verdict,
          footerLine([points ? `+${points} point` : null, remaining]),
        ].filter(Boolean),
        OUTCOME_COLOUR[outcome],
      ),
    );
  }
}
