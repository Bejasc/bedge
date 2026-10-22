import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { DICE_LIMITS, formatDice, parseDice, rollDice } from '../../lib/games/logic.js';
import { gameCard } from '../../lib/games/render.js';

export class RollCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Roll dice, e.g. 2d6 or 1d20+3' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('roll')
        .setDescription(this.description)
        .addStringOption((o) => o.setName('dice').setDescription('Dice notation, e.g. 2d6, d20, 3d8+2 (default 1d6)').setMaxLength(20)),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString('dice') ?? '1d6';
    const spec = parseDice(input);
    if (!spec) {
      await interaction.reply({
        content: `❌ \`${input}\` isn't dice I can roll. Use \`NdM\` or \`NdM+K\` — up to ${DICE_LIMITS.count} dice with up to ${DICE_LIMITS.sides} sides.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const { rolls, total } = rollDice(spec);
    const detail = rolls.length > 1 || spec.modifier ? `-# ${rolls.join(' + ')}${spec.modifier ? ` ${spec.modifier > 0 ? '+' : '−'} ${Math.abs(spec.modifier)}` : ''}` : '';
    await interaction.reply(gameCard([`### 🎲 ${formatDice(spec)} → **${total}**`, detail].filter(Boolean)));
  }
}
