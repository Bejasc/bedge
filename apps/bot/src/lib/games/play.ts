import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import type { BotGame } from '@bedge/types';
import { GAME_LABELS, takeDailyPlay } from './service.js';

/** Uses one of today's vs-bot plays, or replies that the member is out. Returns the "N left today" note, or false. */
export async function usePlay(interaction: ChatInputCommandInteraction<'cached'>, game: BotGame): Promise<string | null | false> {
  const play = await takeDailyPlay(interaction.guildId, interaction.user.id, game);
  if (!play.allowed) {
    const reset = Math.floor(new Date().setUTCHours(24, 0, 0, 0) / 1000);
    await interaction.reply({
      content: `You've used today's ${GAME_LABELS[game].toLowerCase()} plays against the bot. More <t:${reset}:R>.`,
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return play.remaining === null ? null : `${play.remaining} left today`;
}
