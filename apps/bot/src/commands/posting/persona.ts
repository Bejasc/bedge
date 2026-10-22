import { Command } from '@sapphire/framework';
import { PersonaModel } from '@bedge/database';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { log } from '../../lib/logs/router.js';
import { subjectOf } from '../../lib/logs/subject.js';
import { defaultPermissionsFor, tiered } from '../../lib/tier-check.js';

const ephemeral = { flags: MessageFlags.Ephemeral } as const;

export class PersonaCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, ...tiered('admin'), description: 'Manage webhook personas for /post' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('persona')
        .setDescription(this.description)
        .setDefaultMemberPermissions(defaultPermissionsFor('admin'))
        .setDMPermission(false)
        .addSubcommand((s) =>
          s
            .setName('add')
            .setDescription('Add or update a persona')
            .addStringOption((o) => o.setName('name').setDescription('Display name').setRequired(true).setMaxLength(80))
            .addStringOption((o) => o.setName('avatar_url').setDescription('Avatar image URL (https)')),
        )
        .addSubcommand((s) =>
          s
            .setName('remove')
            .setDescription('Remove a persona')
            .addStringOption((o) => o.setName('name').setDescription('Persona').setRequired(true).setAutocomplete(true)),
        )
        .addSubcommand((s) => s.setName('list').setDescription('List personas')),
    );
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction): Promise<void> {
    const query = interaction.options.getFocused().toLowerCase();
    const personas = await PersonaModel.find({ guildId: interaction.guildId }).sort({ name: 1 }).limit(100);
    await interaction.respond(
      personas.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 25).map((p) => ({ name: p.name, value: p.name })),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const personas = await PersonaModel.find({ guildId }).sort({ name: 1 });
      const lines = personas.map((p) => `• **${p.name}**${p.avatarUrl ? ` — [avatar](${p.avatarUrl})` : ''}`);
      await interaction.reply({ content: lines.length ? lines.join('\n') : 'No personas yet. Add one with `/persona add`.', ...ephemeral });
      return;
    }

    const name = interaction.options.getString('name', true).trim();
    let summary: string;
    if (sub === 'add') {
      const avatarUrl = interaction.options.getString('avatar_url') ?? undefined;
      if (avatarUrl && !/^https:\/\/\S+$/.test(avatarUrl)) {
        await interaction.reply({ content: '❌ The avatar must be an https URL.', ...ephemeral });
        return;
      }
      await PersonaModel.findOneAndUpdate({ guildId, name }, { $set: { avatarUrl } }, { upsert: true });
      summary = `Persona **${name}** saved`;
    } else {
      const removed = await PersonaModel.findOneAndDelete({ guildId, name });
      if (!removed) {
        await interaction.reply({ content: `❌ No persona called **${name}**.`, ...ephemeral });
        return;
      }
      summary = `Persona **${name}** removed`;
    }
    await interaction.reply({ content: `✅ ${summary}.`, ...ephemeral });
    await log(interaction.guild, 'server.config', { subject: subjectOf(interaction.member), body: summary });
  }
}
