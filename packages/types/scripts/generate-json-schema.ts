import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { z } from 'zod';

// Import schemas here as they are defined in src/index.ts, e.g.:
// import { GuildConfigSchema } from '../src/schemas/guild-config.schema';

const targets: Array<{ schema: z.ZodTypeAny; path: string }> = [
  // {
  //   schema: GuildConfigSchema,
  //   path: resolve(__dirname, '../../../data/schemas/guild-config.schema.json'),
  // },
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
