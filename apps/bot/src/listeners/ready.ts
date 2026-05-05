import { Events, Listener } from '@sapphire/framework';

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.ClientReady, once: true });
  }

  public run(): void {
    const { client } = this.container;
    const tag = client.user?.tag ?? 'unknown';
    const guildCount = client.guilds.cache.size;
    this.container.logger.info(`Online as ${tag} | ${guildCount} guild(s)`);
  }
}
