import { z } from 'zod';

export const AvailabilityLevelSchema = z.enum(['green', 'yellow', 'orange', 'red']);
export type AvailabilityLevel = z.infer<typeof AvailabilityLevelSchema>;

export const AvailabilityWindowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  level: AvailabilityLevelSchema,
});
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;

export const AvailabilityConfigSchema = z.object({
  guildId: z.string(),
  memberId: z.string(),
  broad: z.array(AvailabilityWindowSchema),
  weekdays: z.record(z.string().regex(/^[0-6]$/), z.array(AvailabilityWindowSchema).nullable()),
});

export type AvailabilityConfig = z.infer<typeof AvailabilityConfigSchema>;
