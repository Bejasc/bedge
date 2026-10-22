import { setTimeout as sleep } from 'node:timers/promises';
import { Command } from '@sapphire/framework';
import { usePlay } from '../../lib/games/play.js';
import { OUTCOME_COLOUR, footerLine, gameCard } from '../../lib/games/render.js';
import { awardPoints, recordOutcome } from '../../lib/games/service.js';
import { PAYTABLE_TEXT, payout, spin, type SlotSymbol } from '../../lib/games/slots.js';

const REEL_DELAY_MS = 700;
const SPINNING = '🌀';

function reelLine(reels: readonly (SlotSymbol | null)[]): string {
  return `# ${reels.map((r) => r ?? SPINNING).join(' │ ')}`;
}

export class SlotsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Pull the lever on the slot machine' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) => builder.setName('slots').setDescription(this.description).setDMPermission(false));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const remaining = await usePlay(interaction, 'slots');
    if (remaining === false) return;

    const reels = spin();
    const title = `### 🎰 Slots — <@${interaction.user.id}>`;
    await interaction.reply(gameCard([title, reelLine([null, null, null]), '-# Spinning…']));
    // The reels stop one at a time for a little suspense.
    for (let stopped = 1; stopped < 3; stopped++) {
      await sleep(REEL_DELAY_MS);
      await interaction.editReply(gameCard([title, reelLine(reels.map((r, i) => (i < stopped ? r : null))), '-# Spinning…']));
    }
    await sleep(REEL_DELAY_MS);

    const result = payout(reels);
    await recordOutcome(interaction.guildId, interaction.user.id, 'slots', result.payout > 0 ? 'win' : 'loss');
    const points = await awardPoints(interaction.guildId, interaction.user.id, result.payout);
    const verdict = result.label
      ? `${result.label === 'JACKPOT' ? '🎉 **JACKPOT!**' : `✨ **${result.label}!**`} Pays **${result.payout}**`
      : 'No luck this time.';
    await interaction.editReply(
      gameCard(
        [title, reelLine(reels), verdict, footerLine([points ? `+${points} point${points === 1 ? '' : 's'}` : null, remaining]), `-# ${PAYTABLE_TEXT}`].filter(Boolean),
        result.label === 'JACKPOT' ? 0xf1c40f : OUTCOME_COLOUR[result.payout > 0 ? 'win' : 'loss'],
      ),
    );
  }
}
