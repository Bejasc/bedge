import { z } from 'zod';

export const AvailabilityLevelSchema = z.enum(['green', 'yellow', 'orange', 'red']);
export type AvailabilityLevel = z.infer<typeof AvailabilityLevelSchema>;

export const AvailabilityWindowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  level: AvailabilityLevelSchema,
});
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;

export const AvailabilityOverrideSchema = z.object({
  level: AvailabilityLevelSchema,
  expiresAt: z.coerce.date(),
});
export type AvailabilityOverride = z.infer<typeof AvailabilityOverrideSchema>;

export const AvailabilityConfigSchema = z.object({
  guildId: z.string(),
  memberId: z.string(),
  broad: z.array(AvailabilityWindowSchema),
  weekdays: z.record(z.string().regex(/^[0-6]$/), z.array(AvailabilityWindowSchema).nullable()),
  override: AvailabilityOverrideSchema.optional().nullable(),
});
export type AvailabilityConfig = z.infer<typeof AvailabilityConfigSchema>;

// Subset schema for user-provided JSON (broad + weekdays only — guildId/memberId/override set by system)
export const AvailabilityWindowsInputSchema = z.object({
  broad: z.array(AvailabilityWindowSchema).default([]),
  weekdays: z.record(
    z.string().regex(/^[0-6]$/, 'Key must be a day number 0–6'),
    z.array(AvailabilityWindowSchema).nullable(),
  ).default({}),
});
export type AvailabilityWindowsInput = z.infer<typeof AvailabilityWindowsInputSchema>;
