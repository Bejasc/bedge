import { Precondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js';
import { TIER_LABELS, tierAtLeast, type Tier } from './permissions.js';
import { tierOf } from './tier-check.js';

export abstract class TierPrecondition extends Precondition {
  protected abstract readonly required: Tier;

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.check(interaction);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.check(interaction);
  }

  private async check(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    return tierAtLeast(await tierOf(interaction), this.required)
      ? this.ok()
      : this.error({ message: `This needs the **${TIER_LABELS[this.required]}** tier.` });
  }
}
