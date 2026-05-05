import { fileURLToPath } from 'url';
import {
  ApplicationCommandRegistries,
  LogLevel,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { createLogger } from '@bejasc/logger';
import { BotLogger } from './lib/logger.js';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

const inner = createLogger('bedge-bot');

export const client = new SapphireClient({
  baseUserDirectory: fileURLToPath(new URL('.', import.meta.url)),
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
  logger: {
    instance: new BotLogger(inner, LogLevel.Info),
    level: LogLevel.Info,
  },
});
