import { MessageFlags, type BaseInteraction } from 'discord.js';
import type { Command } from '@sapphire/framework';
import { config } from '../config.js';
import { getGuildConfig } from './guild-config.js';
import {
  TIER_DEFAULT_PERMISSIONS,
  TIER_LABELS,
  resolveTier,
  tierAtLeast,
  tierSubjectFromMember,
  type Tier,
} from './permissions.js';

declare module '@sapphire/framework' {
  interface Preconditions {
    OwnerOnly: never;
    AdminTier: never;
    ModTier: never;
  }
  interface CommandOptions {
    tier?: Tier;
  }
}

const PRECONDITION_FOR: Record<Exclude<Tier, 'none'>, 'OwnerOnly' | 'AdminTier' | 'ModTier'> = {
  owner: 'OwnerOnly',
  admin: 'AdminTier',
  mod: 'ModTier',
};

/** Command options for a tier-gated command: the tier is both the precondition and the `/help` metadata. */
export function tiered(tier: Tier): Pick<Command.Options, 'tier' | 'preconditions'> {
  return { tier, preconditions: tier === 'none' ? [] : ['GuildOnly', PRECONDITION_FOR[tier]] };
}

export function defaultPermissionsFor(tier: Tier): bigint | null {
  return tier === 'none' ? null : TIER_DEFAULT_PERMISSIONS[tier];
}

export async function tierOf(interaction: BaseInteraction): Promise<Tier> {
  if (interaction.user.id === config.ownerId) return 'owner';
  if (!interaction.inGuild() || !interaction.member) return 'none';
  const guildConfig = await getGuildConfig(interaction.guildId);
  return resolveTier(tierSubjectFromMember(interaction.member), guildConfig.roles, config.ownerId);
}

/** Gate for component and modal handlers, which preconditions don't cover. Replies on denial. */
export async function requireTier(interaction: BaseInteraction, required: Tier): Promise<boolean> {
  if (tierAtLeast(await tierOf(interaction), required)) return true;
  if (interaction.isRepliable()) {
    await interaction.reply({
      content: `❌ This needs the **${TIER_LABELS[required]}** tier.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  return false;
}
