import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { COLOURS } from '../logs/log-types.js';
import { truncate } from '../logs/render.js';
import { displayEmoji } from './logic.js';

export interface StarCard {
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  content: string;
  imageUrl?: string;
  count: number;
  emojiKey: string;
  channelId: string;
  url: string;
  createdAt: Date;
}

export function renderStarCard(card: StarCard) {
  const header = new TextDisplayBuilder().setContent(
    `**${card.authorName}** <@${card.authorId}>\n-# <t:${Math.floor(card.createdAt.getTime() / 1000)}:f> in <#${card.channelId}>`,
  );
  const container = new ContainerBuilder()
    .setAccentColor(COLOURS.yellow)
    .addSectionComponents(
      new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(card.authorAvatarUrl)),
    );
  if (card.content) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(truncate(card.content, 2500)));
  if (card.imageUrl) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((i) => i.setURL(card.imageUrl!)));
  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${displayEmoji(card.emojiKey)} **${card.count}**`))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Jump to message').setURL(card.url),
      ),
    );
  return { components: [container], flags: MessageFlags.IsComponentsV2 as const, allowedMentions: { parse: [] as [] } };
}
