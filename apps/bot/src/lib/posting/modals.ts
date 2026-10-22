import {
  ChannelSelectMenuBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { PostFormat } from '@bedge/types';
import { CARD_MAX } from './payload.js';
import { POSTABLE_CHANNEL_TYPES } from './send.js';

export const BOT_PERSONA = '__bot__';

const FORMAT_OPTIONS: { label: string; value: PostFormat; description: string }[] = [
  { label: 'Text', value: 'text', description: 'A plain message (up to 2000 characters)' },
  { label: 'Card', value: 'card', description: 'A Components V2 card with the brand accent' },
  { label: 'JSON', value: 'json', description: 'A raw payload: content, embeds, components, flags' },
];

/** Discord caps modal text inputs at 4000 characters, so longer content can't be edited here. */
export const MODAL_CONTENT_MAX = CARD_MAX;

function formatLabel(format: PostFormat): LabelBuilder {
  return new LabelBuilder().setLabel('Format').setStringSelectMenuComponent(
    new StringSelectMenuBuilder()
      .setCustomId('format')
      .addOptions(FORMAT_OPTIONS.map((o) => ({ ...o, default: o.value === format }))),
  );
}

function contentLabel(content: string): LabelBuilder {
  const input = new TextInputBuilder()
    .setCustomId('content')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(MODAL_CONTENT_MAX)
    .setRequired(true);
  if (content) input.setValue(content.slice(0, MODAL_CONTENT_MAX));
  return new LabelBuilder().setLabel('Content').setTextInputComponent(input);
}

export interface PostModalOptions {
  channelId: string;
  personas: string[];
  format: PostFormat;
  content: string;
}

export function postModal(o: PostModalOptions): ModalBuilder {
  const personaSelect = new StringSelectMenuBuilder()
    .setCustomId('persona')
    .addOptions(
      { label: 'BedgeBot', value: BOT_PERSONA, default: true },
      ...o.personas.slice(0, 24).map((name) => ({ label: name, value: name })),
    );
  return new ModalBuilder()
    .setCustomId('post:new')
    .setTitle('Post as bot')
    .addLabelComponents(
      new LabelBuilder().setLabel('Channel').setChannelSelectMenuComponent(
        new ChannelSelectMenuBuilder()
          .setCustomId('channel')
          .setChannelTypes(...POSTABLE_CHANNEL_TYPES)
          .setDefaultChannels(o.channelId),
      ),
      new LabelBuilder().setLabel('Post as').setStringSelectMenuComponent(personaSelect),
      formatLabel(o.format),
      contentLabel(o.content),
    );
}

export function editModal(channelId: string, messageId: string, format: PostFormat, content: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`post:edit:${channelId}:${messageId}`)
    .setTitle('Edit bot message')
    .addLabelComponents(formatLabel(format), contentLabel(content));
}

export function templateModal(name: string, format: PostFormat, content: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId('post:template')
    .setTitle('Save template')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Name')
        .setTextInputComponent(new TextInputBuilder().setCustomId('name').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setValue(name || 'untitled')),
      formatLabel(format),
      contentLabel(content),
    );
}
