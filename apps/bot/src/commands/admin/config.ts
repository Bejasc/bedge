import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { getGuildConfig } from '../../lib/guild-config.js';
import { DEFAULT_VIEW, renderConfigPanel } from '../../lib/config-panel.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

export class ConfigCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Open the server config panel' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('config')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('admin'))
        .setDMPermission(false),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const config = await getGuildConfig(interaction.guildId!);
    const panel = renderConfigPanel(config, interaction.guild?.name ?? 'this server', DEFAULT_VIEW);
    await interaction.reply({ ...panel, flags: panel.flags | MessageFlags.Ephemeral });
  }
}
