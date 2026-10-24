import { createDraft, findDraft, PersonaModel, type DraftView } from '@bedge/database';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  type Message,
} from 'discord.js';
import { config } from '../../config.js';
import { log } from '../logs/router.js';
import { subjectOf } from '../logs/subject.js';
import { requireTier } from '../tier-check.js';
import { buildPostPayload, inferFormat, type OutgoingPost } from './payload.js';
import { editPost, isEditable, sendPost, type PersonaIdentity } from './send.js';

const CHOICE_TTL_MS = 15 * 60 * 1000;

interface PendingChoice {
  draft: DraftView;
  payload: OutgoingPost;
  channelId: string;
  persona?: PersonaIdentity;
  at: number;
}

// Custom IDs can't hold a persona name and a draft code comfortably, so the choice waits here, keyed by interaction ID.
const pendingChoices = new Map<string, PendingChoice>();

export function builderLink(code: string): string | null {
  return config.builderUrl ? `${config.builderUrl}/builder/?code=${code}` : null;
}

export function editableContent(message: Message) {
  return inferFormat({
    content: message.content,
    embeds: message.embeds.map((e) => e.toJSON() as Record<string, unknown>),
    components: message.components.map((c) => c.toJSON() as unknown as Record<string, unknown>),
    flags: message.flags.bitfield,
  });
}

export function messagePayload(message: Message): OutgoingPost | null {
  const { format, content } = editableContent(message);
  const built = buildPostPayload(format, content);
  return built.ok ? built.payload : null;
}

/** Saves a message as a draft; bedge's own posts keep a link back so `/post code:` can update them in place. */
export async function openInBuilder(message: Message<true>): Promise<{ code: string; link: string | null; linked: boolean } | null> {
  const payload = messagePayload(message);
  if (!payload) return null;
  const linked = isEditable(message);
  const draft = await createDraft(
    payload,
    linked ? { guildId: message.guildId, channelId: message.channelId, messageId: message.id } : undefined,
  );
  return { code: draft.code, link: builderLink(draft.code), linked };
}

async function postNew(
  interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>,
  choice: Omit<PendingChoice, 'at'>,
): Promise<string> {
  const channel = await interaction.guild.channels.fetch(choice.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) return '❌ I can’t post in that channel.';
  const message = await sendPost(channel as GuildTextBasedChannel, choice.payload, choice.persona);
  await log(interaction.guild, 'post.create', {
    subject: subjectOf(interaction.member),
    fields: [
      { name: 'Channel', value: `<#${channel.id}>` },
      { name: 'As', value: choice.persona?.name ?? 'BedgeBot' },
      { name: 'Draft', value: `\`${choice.draft.code}\`` },
    ],
    links: [{ label: 'Jump to post', url: message.url }],
  });
  return `✅ Posted draft \`${choice.draft.code}\` in <#${channel.id}> — ${message.url}`;
}

async function updateOriginal(interaction: ButtonInteraction<'cached'>, choice: PendingChoice): Promise<string> {
  const source = choice.draft.source!;
  const channel = await interaction.guild.channels.fetch(source.channelId).catch(() => null);
  const message = channel?.isTextBased() ? await channel.messages.fetch(source.messageId).catch(() => null) : null;
  if (!message || !isEditable(message)) return '❌ The original message is gone or no longer editable.';
  await editPost(message, choice.payload);
  await log(interaction.guild, 'post.edit', {
    subject: subjectOf(interaction.member),
    fields: [
      { name: 'Channel', value: `<#${source.channelId}>` },
      { name: 'Draft', value: `\`${choice.draft.code}\`` },
    ],
    links: [{ label: 'Jump to post', url: message.url }],
  });
  return `✏️ Updated the original from draft \`${choice.draft.code}\` — ${message.url}`;
}

export async function postDraft(
  interaction: ChatInputCommandInteraction<'cached'>,
  code: string,
  channelId: string,
  personaName: string | null,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const draft = await findDraft(code);
  if (!draft) return void (await interaction.editReply('❌ No draft with that code — it may have expired (drafts last 7 days).'));

  const built = buildPostPayload('json', JSON.stringify(draft.payload));
  if (!built.ok) return void (await interaction.editReply(`❌ That draft can’t be posted:\n${built.error}`));

  const personaDoc = personaName ? await PersonaModel.findOne({ guildId: interaction.guildId, name: personaName }) : null;
  if (personaName && !personaDoc) return void (await interaction.editReply(`❌ No persona called **${personaName}**.`));
  const persona = personaDoc ? { name: personaDoc.name, avatarUrl: personaDoc.avatarUrl } : undefined;
  const choice = { draft, payload: built.payload, channelId, persona };

  if (draft.source?.guildId === interaction.guildId) {
    pendingChoices.set(interaction.id, { ...choice, at: Date.now() });
    for (const [id, c] of pendingChoices) if (Date.now() - c.at > CHOICE_TTL_MS) pendingChoices.delete(id);
    await interaction.editReply({
      content: `Draft \`${draft.code}\` was opened from an existing message. Update it, or post a copy in <#${channelId}>?`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`draft:edit:${interaction.id}`).setStyle(ButtonStyle.Primary).setLabel('Update original'),
          new ButtonBuilder().setCustomId(`draft:new:${interaction.id}`).setStyle(ButtonStyle.Secondary).setLabel('Post as new'),
        ),
      ],
    });
    return;
  }

  try {
    await interaction.editReply(await postNew(interaction, choice));
  } catch (error) {
    await interaction.editReply(`❌ Discord rejected the post: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleDraftButton(interaction: ButtonInteraction<'cached'>): Promise<void> {
  if (!(await requireTier(interaction, 'admin'))) return;
  const [, action, id] = interaction.customId.split(':');
  const choice = pendingChoices.get(id);
  if (!choice) {
    await interaction.update({ content: '⌛ That choice expired — run `/post code:` again.', components: [] });
    return;
  }
  pendingChoices.delete(id);
  await interaction.update({ content: '⏳ Working…', components: [] });
  try {
    const result = action === 'edit' ? await updateOriginal(interaction, choice) : await postNew(interaction, choice);
    await interaction.editReply(result);
  } catch (error) {
    await interaction.editReply(`❌ Discord rejected it: ${error instanceof Error ? error.message : String(error)}`);
  }
}
