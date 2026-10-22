import type { ButtonBuilder } from 'discord.js';
import type { LogCategory } from '@bedge/types';

export interface LogType {
  key: string;
  category: LogCategory;
  emoji: string;
  title: string;
  accentColour: number;
}

export interface LogSubject {
  id: string;
  label: string;
  avatarUrl?: string;
}

export interface LogField {
  name: string;
  value: string;
}

export interface LogLink {
  label: string;
  url: string;
}

export interface LogPayload {
  subject?: LogSubject;
  body?: string;
  fields?: LogField[];
  links?: LogLink[];
  /** Interactive buttons; their custom IDs must carry the guild ID so they work from the admin mirror too. */
  actions?: ButtonBuilder[];
  imageUrl?: string;
  at?: Date;
}

export interface MirrorSource {
  guildName: string;
  guildIconUrl?: string;
  localLogUrl?: string;
}
