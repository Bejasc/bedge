import { Command } from '@sapphire/framework';
import {
  handleAvailabilityView,
  handleAvailabilitySet,
  handleAvailabilityReset,
  handleAvailabilityOverride,
} from '../../functions/time-tracking/availability.js';

export class AvailabilityCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Manage your availability status' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('availability')
        .setDescription('Manage your availability status')
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View your availability config as JSON')
            .addUserOption((o) =>
              o.setName('member').setDescription('Member to view (admins only; defaults to you)'),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Edit your availability config via JSON modal')
            .addUserOption((o) =>
              o.setName('member').setDescription('Member to configure (admins only; defaults to you)'),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('reset')
            .setDescription('Reset availability to default rules')
            .addUserOption((o) =>
              o.setName('member').setDescription('Member to reset (admins only; defaults to you)'),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('override')
            .setDescription('Temporarily set your availability status')
            .addStringOption((o) =>
              o
                .setName('status')
                .setDescription('Availability status')
                .setRequired(true)
                .addChoices(
                  { name: '🟢 Available', value: 'green' },
                  { name: '🟡 Maybe available', value: 'yellow' },
                  { name: '🟠 Probably unavailable', value: 'orange' },
                  { name: '🔴 Unavailable', value: 'red' },
                ),
            )
            .addStringOption((o) =>
              o
                .setName('duration')
                .setDescription('How long the override lasts, e.g. 3h, 30m, 1h30m')
                .setRequired(true),
            )
            .addUserOption((o) =>
              o.setName('member').setDescription('Member to override (admins only; defaults to you)'),
            ),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'view':
        return handleAvailabilityView(interaction);
      case 'set':
        return handleAvailabilitySet(interaction);
      case 'reset':
        return handleAvailabilityReset(interaction);
      case 'override':
        return handleAvailabilityOverride(interaction);
      default:
        await interaction.reply({ content: `Unknown subcommand: ${sub}`, ephemeral: true });
    }
  }
}
