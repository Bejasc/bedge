import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { logToAdmin } from '../../lib/logs/router.js';

export class GuildDeleteListener extends Listener<typeof Events.GuildDelete> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildDelete });
  }

  public async run(guild: Guild): Promise<void> {
    // An outage also emits guildDelete; only a real removal should be reported.
    if (!guild.available) return;
    this.container.logger.info(`Removed from guild ${guild.name} (${guild.id})`);
    await logToAdmin(guild, 'bot.removed', {
      body: `Removed from **${guild.name}**. Its config is kept in case the bot is re-added.`,
      fields: [{ name: 'Server ID', value: `\`${guild.id}\`` }],
    });
  }
}
