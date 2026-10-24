import { Command } from '@sapphire/framework';
import { GuildEventModel } from '@bedge/database';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { upcomingEvents } from '../../lib/guild-events/interactions.js';
import { eventModal, renderManagePanel } from '../../lib/guild-events/render.js';
import { defaultTimezoneFor, eventUrl, getEvent, toView } from '../../lib/guild-events/service.js';
import { POSTABLE_CHANNEL_TYPES } from '../../lib/posting/send.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

export class EventCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('mod'), description: 'Create and manage events with RSVPs and reminders' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('event')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('mod'))
        .setDMPermission(false)
        .addSubcommand((s) =>
          s
            .setName('create')
            .setDescription('Post a new event')
            .addChannelOption((o) => o.setName('channel').setDescription('Where to post it (default: here)').addChannelTypes(...POSTABLE_CHANNEL_TYPES))
            .addRoleOption((o) => o.setName('ping_role').setDescription('Role to ping in reminders')),
        )
        .addSubcommand((s) =>
          s
            .setName('manage')
            .setDescription('Reminders, edits and cancellation')
            .addStringOption((o) => o.setName('event').setDescription('Event').setRequired(true).setAutocomplete(true)),
        )
        .addSubcommand((s) => s.setName('list').setDescription('Upcoming events in this server')),
    );
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.guildId) return interaction.respond([]);
    const query = interaction.options.getFocused().toLowerCase();
    const docs = await GuildEventModel.find({ guildId: interaction.guildId }).sort({ startsAt: -1 }).limit(50);
    await interaction.respond(
      docs
        .filter((d) => `${d.eventNumber} ${d.title}`.toLowerCase().includes(query))
        .slice(0, 25)
        .map((d) => ({ name: `#${d.eventNumber} ${d.title}${d.cancelled ? ' (cancelled)' : ''}`.slice(0, 100), value: String(d._id) })),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const channelId = interaction.options.getChannel('channel')?.id ?? interaction.channelId;
      const roleId = interaction.options.getRole('ping_role')?.id ?? '-';
      await interaction.showModal(
        eventModal(`evtc:${channelId}:${roleId}`, 'New event', { timezone: await defaultTimezoneFor(interaction.guildId, interaction.user.id) }),
      );
      return;
    }

    if (sub === 'manage') {
      const doc = await getEvent(interaction.options.getString('event', true));
      if (!doc || doc.guildId !== interaction.guildId) {
        await interaction.reply({ content: '❌ Pick an event from the list.', flags: MessageFlags.Ephemeral });
        return;
      }
      const event = toView(doc);
      await interaction.reply(renderManagePanel(event, eventUrl(event)));
      return;
    }

    const events = await upcomingEvents(interaction.guildId);
    const lines = events.map((e) => {
      const going = e.rsvps.filter((r) => r.status === 'going').length;
      const url = eventUrl(e);
      return `\`#${e.eventNumber}\` **${url ? `[${e.title}](${url})` : e.title}** — <t:${Math.floor(e.startsAt.getTime() / 1000)}:F> · ✅ ${going}`;
    });
    await interaction.reply({ content: lines.length ? lines.join('\n') : 'No upcoming events.', flags: MessageFlags.Ephemeral });
  }
}
