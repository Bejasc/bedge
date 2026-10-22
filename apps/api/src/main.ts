import 'reflect-metadata';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { connectDatabase } from '@bedge/database';
import { AppModule } from './app.module.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

async function bootstrap(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('Missing required env var: MONGODB_URI');
  await connectDatabase(mongoUri);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '64kb' });
  app.useStaticAssets(PUBLIC_DIR);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
