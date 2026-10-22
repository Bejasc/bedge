import { Events, Listener } from '@sapphire/framework';
import type { Guild, GuildAuditLogsEntry } from 'discord.js';
import { classifyAuditEntry, type AuditChange } from '../../lib/events/diffs.js';
import { discordTime } from '../../lib/events/format.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import type { LogField } from '../../lib/logs/types.js';

export class GuildAuditLogEntryCreateLogListener extends Listener<typeof Events.GuildAuditLogEntryCreate> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.GuildAuditLogEntryCreate });
  }

  public async run(entry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
    const classified = classifyAuditEntry(entry.action, entry.changes as readonly AuditChange[]);
    if (!classified || !entry.targetId) return;

    const target = await this.container.client.users.fetch(entry.targetId).catch(() => null);
    const fields: LogField[] = [
      { name: 'Moderator', value: entry.executorId ? `<@${entry.executorId}>` : 'Unknown' },
      { name: 'Reason', value: entry.reason ?? '*No reason given*' },
    ];
    if (classified.until) fields.push({ name: 'Until', value: `${discordTime(classified.until)} (${discordTime(classified.until, 'R')})` });

    await log(guild, classified.key, {
      subject: target ? subjectOf(target) : { id: entry.targetId, label: entry.targetId },
      fields,
    });
  }
}
