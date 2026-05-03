import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { TimeTrackConfigSchema } from '../src/schemas/time-track-config.js';
import { AvailabilityConfigSchema } from '../src/schemas/availability-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const targets: Array<{ schema: z.ZodTypeAny; path: string }> = [
  {
    schema: TimeTrackConfigSchema,
    path: resolve(__dirname, '../../../data/schemas/time-track-config.schema.json'),
  },
  {
    schema: AvailabilityConfigSchema,
    path: resolve(__dirname, '../../../data/schemas/availability-config.schema.json'),
  },
];

for (const { schema, path } of targets) {
  const json = z.toJSONSchema(schema, { target: 'draft-7' });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path}`);
}

if (targets.length === 0) {
  console.log('No schemas defined yet — add entries to targets[] as schemas are added.');
}
