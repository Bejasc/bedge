import { Events, Listener } from '@sapphire/framework';
import type { AutoModerationActionExecution } from 'discord.js';
import { RecentKeys } from '../../lib/events/diffs.js';
import { quote } from '../../lib/events/format.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import type { LogField } from '../../lib/logs/types.js';

const recent = new RecentKeys(10_000);

export class AutoModerationActionExecutionLogListener extends Listener<typeof Events.AutoModerationActionExecution> {
  public constructor(context: Listener.LoaderContext) {
    super(context, { event: Events.AutoModerationActionExecution });
  }

  public async run(execution: AutoModerationActionExecution): Promise<void> {
    const { guild } = execution;
    const key = `${guild.id}:${execution.userId}:${execution.ruleId}:${execution.messageId ?? execution.content}`;
    if (recent.seen(key)) return;

    const rule = execution.autoModerationRule ?? (await guild.autoModerationRules.fetch(execution.ruleId).catch(() => null));
    const user = await this.container.client.users.fetch(execution.userId).catch(() => null);
    const fields: LogField[] = [
      { name: 'Rule', value: rule?.name ?? `\`${execution.ruleId}\`` },
      { name: 'Channel', value: execution.channelId ? `<#${execution.channelId}>` : 'Unknown' },
    ];
    if (execution.matchedKeyword) fields.push({ name: 'Matched', value: `\`${execution.matchedKeyword}\`` });

    await log(guild, 'automod.action', {
      subject: user ? subjectOf(user) : { id: execution.userId, label: execution.userId },
      body: execution.content ? quote(execution.content, 1200) : undefined,
      fields,
    });
  }
}
