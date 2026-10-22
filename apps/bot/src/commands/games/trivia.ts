import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { usePlay } from '../../lib/games/play.js';
import { TRIVIA_CATEGORIES, type Difficulty } from '../../lib/games/trivia.js';
import { channelBusy, startTrivia } from '../../lib/games/trivia-session.js';
import { nextQuestion } from '../../lib/games/trivia-source.js';

export class TriviaCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, description: 'Ask the channel a trivia question — fastest right answer wins' });
  }

  public override registerApplicationCommands(registry: Command.Registry): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('trivia')
        .setDescription(this.description)
        .setDMPermission(false)
        .addIntegerOption((o) =>
          o
            .setName('category')
            .setDescription('Pick a category (default: anything)')
            .addChoices(...TRIVIA_CATEGORIES.map((c) => ({ name: `${c.emoji} ${c.name}`, value: c.id }))),
        )
        .addStringOption((o) =>
          o.setName('difficulty').setDescription('Pick a difficulty (default: any)').addChoices(
            { name: '🟢 Easy', value: 'easy' },
            { name: '🟡 Medium', value: 'medium' },
            { name: '🔴 Hard', value: 'hard' },
          ),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (channelBusy(interaction.channelId)) {
      await interaction.reply({ content: 'There’s already a question live in this channel — answer that one first!', flags: MessageFlags.Ephemeral });
      return;
    }
    const remaining = await usePlay(interaction, 'trivia');
    if (remaining === false) return;

    // Fetching can wait out the trivia API's rate limit, so acknowledge first.
    await interaction.deferReply();
    const { question, offline } = await nextQuestion(
      interaction.options.getInteger('category') ?? undefined,
      (interaction.options.getString('difficulty') as Difficulty | null) ?? undefined,
    );
    if (channelBusy(interaction.channelId)) {
      await interaction.editReply('Someone else started a question here while I was fetching one — answer theirs!');
      return;
    }
    await startTrivia(interaction, question, offline);
  }
}
