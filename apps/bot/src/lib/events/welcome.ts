import { ContainerBuilder, MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from 'discord.js';
import { BRAND_COLOUR } from '../brand.js';

export const DEFAULT_WELCOME = 'Welcome to **{server}**, {user}! You are member #{memberCount}.';
export const WELCOME_MAX = 1500;

export interface WelcomeVars {
  userId: string;
  username: string;
  server: string;
  memberCount: number;
}

export function renderWelcomeText(template: string | undefined, vars: WelcomeVars): string {
  return (template?.trim() || DEFAULT_WELCOME)
    .replaceAll('{user}', `<@${vars.userId}>`)
    .replaceAll('{username}', vars.username)
    .replaceAll('{server}', vars.server)
    .replaceAll('{memberCount}', String(vars.memberCount));
}

export function renderWelcomeCard(text: string, avatarUrl: string, userId: string) {
  const container = new ContainerBuilder()
    .setAccentColor(BRAND_COLOUR)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl)),
    );
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as const,
    allowedMentions: { users: [userId] },
  };
}
