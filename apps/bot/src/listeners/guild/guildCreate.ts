import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { primeInvites } from '../../lib/events/invite-tracker.js';
import { getGuildConfig } from '../../lib/guild-config.js';
import { logToAdmin } from '../../lib/logs/router.js';

export class GuildCreateListener extends Listener<typeof Events.GuildCreate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildCreate });
  }

  public async run(guild: Guild): Promise<void> {
    await getGuildConfig(guild.id);
    await primeInvites(guild).catch(() => undefined);
    this.container.logger.info(`Joined guild ${guild.name} (${guild.id})`);
    await logToAdmin(guild, 'bot.joined', {
      body: `Joined **${guild.name}**. Run \`/config\` there to set log channels and roles.`,
      fields: [
        { name: 'Server ID', value: `\`${guild.id}\`` },
        { name: 'Members', value: String(guild.memberCount) },
        { name: 'Owner', value: `<@${guild.ownerId}>` },
      ],
    });
  }
}
