import { Events, Listener } from '@sapphire/framework';
import type { Guild, GuildAuditLogsEntry } from 'discord.js';
import type { ModCaseType } from '@bedge/types';
import { classifyAuditEntry, type AuditChange, type ModLogKey } from '../../lib/events/diffs.js';
import { logCase } from '../../lib/moderation/actions.js';
import { createCase } from '../../lib/moderation/cases.js';
import { consumePending } from '../../lib/moderation/pending.js';

const CASE_TYPE: Record<ModLogKey, ModCaseType> = {
  'mod.kick': 'kick',
  'mod.ban': 'ban',
  'mod.unban': 'unban',
  'mod.timeout': 'timeout',
  'mod.untimeout': 'untimeout',
};

/** Opens a case for kicks, bans and timeouts that bedge didn't perform itself (Discord's UI, other bots). */
export class GuildAuditLogEntryCreateLogListener extends Listener<typeof Events.GuildAuditLogEntryCreate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildAuditLogEntryCreate });
  }

  public async run(entry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
    const classified = classifyAuditEntry(entry.action, entry.changes as readonly AuditChange[]);
    if (!classified || !entry.targetId) return;
    const type = CASE_TYPE[classified.key];
    if (consumePending(guild.id, entry.targetId, type)) return;

    const target = await this.container.client.users.fetch(entry.targetId).catch(() => null);
    const modCase = await createCase({
      guildId: guild.id,
      type,
      targetId: entry.targetId,
      moderatorId: entry.executorId ?? 'unknown',
      reason: entry.reason ?? 'No reason given',
      expiresAt: classified.until,
      source: 'audit',
    });
    await logCase(guild, modCase, target);
  }
}
