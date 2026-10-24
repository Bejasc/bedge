import { Events, Listener } from '@sapphire/framework';
import type { Client } from 'discord.js';
import { BRAND_EMOJI_NAME, loadBrandEmoji } from '../lib/brand.js';
import { primeInvites } from '../lib/events/invite-tracker.js';

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ClientReady, once: true });
  }

  public async run(client: Client<true>): Promise<void> {
    const tag = client.user?.tag ?? 'unknown';
    const guildCount = client.guilds.cache.size;
    this.container.logger.info(`Online as ${tag} | ${guildCount} guild(s)`);

    const found = await loadBrandEmoji(client).catch(() => false);
    if (!found) {
      this.container.logger.warn(`Brand emoji "${BRAND_EMOJI_NAME}" not found in application emojis — log footers will be text-only`);
    }

    for (const guild of client.guilds.cache.values()) {
      await primeInvites(guild).catch(() => undefined);
    }
  }
}
