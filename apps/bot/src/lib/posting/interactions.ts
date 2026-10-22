import { PersonaModel, PostTemplateModel } from '@bedge/database';
import { PostFormatSchema, type PostFormat } from '@bedge/types';
import { MessageFlags, type AutocompleteInteraction, type Message, type ModalSubmitInteraction } from 'discord.js';
import { log } from '../logs/router.js';
import { subjectOf } from '../logs/subject.js';
import { requireTier } from '../tier-check.js';
import { BOT_PERSONA } from './modals.js';
import { buildPostPayload } from './payload.js';
import { editPost, isEditable, sendPost } from './send.js';

export async function personaNames(guildId: string): Promise<string[]> {
  const personas = await PersonaModel.find({ guildId }).sort({ name: 1 }).limit(24);
  return personas.map((p) => p.name);
}

async function respondWithNames(interaction: AutocompleteInteraction, names: string[]): Promise<void> {
  const query = interaction.options.getFocused().toLowerCase();
  await interaction.respond(
    names
      .filter((n) => n.toLowerCase().includes(query))
      .slice(0, 25)
      .map((n) => ({ name: n, value: n })),
  );
}

export async function templateAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  if (!interaction.guildId) return interaction.respond([]);
  const templates = await PostTemplateModel.find({ guildId: interaction.guildId }).sort({ name: 1 }).limit(100);
  await respondWithNames(interaction, templates.map((t) => t.name));
}

export async function personaAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  if (!interaction.guildId) return interaction.respond([]);
  const personas = await PersonaModel.find({ guildId: interaction.guildId }).sort({ name: 1 }).limit(100);
  await respondWithNames(interaction, personas.map((p) => p.name));
}

function readFormat(interaction: ModalSubmitInteraction): PostFormat {
  return PostFormatSchema.catch('text').parse(interaction.fields.getStringSelectValues('format')[0]);
}

/** Errors echo the submitted content back so nothing typed into the modal is lost. */
async function failWithContent(interaction: ModalSubmitInteraction, error: string, content: string): Promise<void> {
  const echo = content.length > 1500 ? `${content.slice(0, 1500)}…` : content;
  await interaction.editReply({ content: `❌ ${error}\n\nYour content, to copy back:\n\`\`\`\n${echo.replaceAll('```', 'ˋˋˋ')}\n\`\`\`` });
}

async function handleNewPost(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  const content = interaction.fields.getTextInputValue('content');
  const format = readFormat(interaction);
  const channelId = interaction.fields.getSelectedChannels('channel', true).first()?.id;
  const personaName = interaction.fields.getStringSelectValues('persona')[0] ?? BOT_PERSONA;

  const built = buildPostPayload(format, content);
  if (!built.ok) return failWithContent(interaction, built.error, content);

  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased() || !channel.isSendable()) return failWithContent(interaction, 'I can’t post in that channel.', content);

  const persona = personaName === BOT_PERSONA ? null : await PersonaModel.findOne({ guildId: interaction.guildId, name: personaName });
  let message: Message;
  try {
    message = await sendPost(channel, built.payload, persona ? { name: persona.name, avatarUrl: persona.avatarUrl } : undefined);
  } catch (error) {
    return failWithContent(interaction, `Discord rejected the post: ${error instanceof Error ? error.message : String(error)}`, content);
  }

  await interaction.editReply(`✅ Posted in <#${channel.id}> — ${message.url}`);
  await log(interaction.guild, 'post.create', {
    subject: subjectOf(interaction.member),
    fields: [
      { name: 'Channel', value: `<#${channel.id}>` },
      { name: 'As', value: persona?.name ?? 'BedgeBot' },
      { name: 'Format', value: format },
    ],
    links: [{ label: 'Jump to post', url: message.url }],
  });
}

async function handleEdit(interaction: ModalSubmitInteraction<'cached'>, channelId: string, messageId: string): Promise<void> {
  const content = interaction.fields.getTextInputValue('content');
  const format = readFormat(interaction);
  const built = buildPostPayload(format, content);
  if (!built.ok) return failWithContent(interaction, built.error, content);

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  const message = channel?.isTextBased() ? await channel.messages.fetch(messageId).catch(() => null) : null;
  if (!message || !isEditable(message)) return failWithContent(interaction, 'That message is gone or isn’t one I can edit.', content);

  try {
    await editPost(message, built.payload);
  } catch (error) {
    return failWithContent(interaction, `Discord rejected the edit: ${error instanceof Error ? error.message : String(error)}`, content);
  }
  await interaction.editReply(`✏️ Edited — ${message.url}`);
  await log(interaction.guild, 'post.edit', {
    subject: subjectOf(interaction.member),
    fields: [
      { name: 'Channel', value: `<#${channelId}>` },
      { name: 'Format', value: format },
    ],
    links: [{ label: 'Jump to post', url: message.url }],
  });
}

async function handleTemplate(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  const name = interaction.fields.getTextInputValue('name').trim();
  const content = interaction.fields.getTextInputValue('content');
  const format = readFormat(interaction);
  const built = buildPostPayload(format, content);
  if (!built.ok) return failWithContent(interaction, built.error, content);

  const existing = await PostTemplateModel.findOneAndUpdate(
    { guildId: interaction.guildId, name },
    { $set: { format, content, createdBy: interaction.user.id } },
    { upsert: true },
  );
  await interaction.editReply(`💾 Template **${name}** ${existing ? 'updated' : 'saved'}. Post it with \`/post template:${name}\`.`);
  await log(interaction.guild, 'server.config', {
    subject: subjectOf(interaction.member),
    body: `Template **${name}** ${existing ? 'updated' : 'saved'} (${format})`,
  });
}

export async function handlePostModal(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  if (!(await requireTier(interaction, 'admin'))) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const [, kind, channelId, messageId] = interaction.customId.split(':');
  if (kind === 'new') return handleNewPost(interaction);
  if (kind === 'edit') return handleEdit(interaction, channelId, messageId);
  if (kind === 'template') return handleTemplate(interaction);
}
