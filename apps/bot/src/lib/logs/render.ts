import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import { brandFooter } from '../brand.js';
import type { LogLink, LogPayload, LogType, MirrorSource } from './types.js';

export const LIMITS = {
  title: 200,
  body: 1500,
  fieldName: 64,
  fieldValue: 400,
  fields: 8,
  fieldsTotal: 1600,
  buttons: 5,
} as const;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const marker = '… *(truncated)*';
  return text.slice(0, Math.max(0, max - marker.length)).trimEnd() + marker;
}

export function renderTitle(type: LogType, payload: LogPayload): string {
  const subject = payload.subject ? ` — ${payload.subject.label}` : '';
  return truncate(`${type.emoji} ${type.title}${subject}`, LIMITS.title);
}

function bodyBlocks(payload: LogPayload): string[] {
  const blocks: string[] = [];
  if (payload.body) blocks.push(truncate(payload.body, LIMITS.body));
  const fields = (payload.fields ?? []).slice(0, LIMITS.fields);
  if (fields.length > 0) {
    const joined = fields
      .map((f) => `**${truncate(f.name, LIMITS.fieldName)}**\n${truncate(f.value || '—', LIMITS.fieldValue)}`)
      .join('\n');
    blocks.push(truncate(joined, LIMITS.fieldsTotal));
  }
  return blocks;
}

function linkButton(link: LogLink): ButtonBuilder {
  return new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(truncate(link.label, 80)).setURL(link.url);
}

function addButtons(container: ContainerBuilder, links: LogLink[], actions: ButtonBuilder[] = []): void {
  const buttons = [...links.map(linkButton), ...actions];
  for (let i = 0; i < buttons.length; i += LIMITS.buttons) {
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + LIMITS.buttons)),
    );
  }
}

function addBody(container: ContainerBuilder, payload: LogPayload): void {
  for (const block of bodyBlocks(payload)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
  }
  if (payload.imageUrl) {
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((item) => item.setURL(payload.imageUrl!)));
  }
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(brandFooter(payload.at)));
}

export interface RenderedLog {
  components: ContainerBuilder[];
  flags: MessageFlags.IsComponentsV2;
  allowedMentions: { parse: [] };
}

function rendered(container: ContainerBuilder): RenderedLog {
  return { components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
}

export function renderLog(type: LogType, payload: LogPayload): RenderedLog {
  const container = new ContainerBuilder().setAccentColor(type.accentColour);
  const title = new TextDisplayBuilder().setContent(`### ${renderTitle(type, payload)}`);
  if (payload.subject?.avatarUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(title, new TextDisplayBuilder().setContent(`-# <@${payload.subject.id}> • \`${payload.subject.id}\``))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(payload.subject.avatarUrl)),
    );
  } else {
    container.addTextDisplayComponents(title);
  }
  addBody(container, payload);
  addButtons(container, payload.links ?? [], payload.actions);
  return rendered(container);
}

export function renderMirror(type: LogType, payload: LogPayload, source: MirrorSource): RenderedLog {
  const container = new ContainerBuilder().setAccentColor(type.accentColour);
  const header = [
    new TextDisplayBuilder().setContent(`-# 📡 **${truncate(source.guildName, 100)}**`),
    new TextDisplayBuilder().setContent(`### ${renderTitle(type, payload)}`),
  ];
  if (source.guildIconUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(...header)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(source.guildIconUrl)),
    );
  } else {
    container.addTextDisplayComponents(...header);
  }
  if (payload.subject) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# <@${payload.subject.id}> • \`${payload.subject.id}\``),
    );
  }
  addBody(container, payload);
  const links: LogLink[] = [];
  const sourceLink = payload.links?.[0];
  if (sourceLink) links.push({ label: 'Jump to source', url: sourceLink.url });
  if (source.localLogUrl) links.push({ label: 'Jump to log', url: source.localLogUrl });
  addButtons(container, links, payload.actions);
  return rendered(container);
}
