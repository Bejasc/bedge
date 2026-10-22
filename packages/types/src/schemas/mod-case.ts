import { z } from 'zod';

export const ModCaseTypeSchema = z.enum(['note', 'warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban']);
export type ModCaseType = z.infer<typeof ModCaseTypeSchema>;

export const ModCaseSchema = z.object({
  guildId: z.string(),
  caseNumber: z.number().int().positive(),
  type: ModCaseTypeSchema,
  targetId: z.string(),
  moderatorId: z.string(),
  reason: z.string().max(1000),
  /** Timeouts only. */
  expiresAt: z.string().datetime().optional(),
  /** `bot` when bedge performed it, `audit` when it was picked up from the audit log. */
  source: z.enum(['bot', 'audit']),
  logUrl: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
});
export type ModCase = z.infer<typeof ModCaseSchema>;
