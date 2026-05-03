import type { SapphireClient } from '@sapphire/framework';

export function createUpdateTimeChannelsJob(client: SapphireClient) {
  return async (): Promise<void> => {
    // Implemented in Phase 4
    client.logger.debug('update-time-channels: tick');
  };
}
