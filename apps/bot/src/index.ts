import 'dotenv/config';
import { container } from '@sapphire/framework';
import { config } from './config.js';
import { client } from './client.js';
import { connectDatabase } from '@bedge/database';

async function main(): Promise<void> {
  try {
    await connectDatabase(config.mongoUri);
    container.logger.info('Database connected');
    await client.login(config.discordToken);
  } catch (error) {
    container.logger.fatal('Startup failed:', error);
    process.exit(1);
  }
}

main();
