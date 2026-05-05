import 'dotenv/config';
import { container } from '@sapphire/framework';
import { config } from './config.js';
import { client } from './client.js';
import { connectDatabase } from '@bedge/database';
import { taskManager } from './lib/task-manager.js';
import { createUpdateTimeChannelsJob } from './jobs/update-time-channels.js';

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  container.logger.fatal('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  container.logger.fatal('Uncaught exception', error);
  process.exit(1);
});

async function main(): Promise<void> {
  try {
    await connectDatabase(config.mongoUri);
    container.logger.info('Database connected');
    taskManager.register('update-time-channels', config.timeChannelCron, createUpdateTimeChannelsJob(client));
    await client.login(config.discordToken);
  } catch (error) {
    container.logger.fatal('Startup failed:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

main();
