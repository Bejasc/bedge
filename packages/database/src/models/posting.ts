import mongoose, { Schema, Document } from 'mongoose';
import type { Persona, PostTemplate } from '@bedge/types';

export interface PersonaDocument extends Persona, Document {}
export interface PostTemplateDocument extends PostTemplate, Document {}

const PersonaSchemaMongoose = new Schema<PersonaDocument>({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
});
PersonaSchemaMongoose.index({ guildId: 1, name: 1 }, { unique: true });

const PostTemplateSchemaMongoose = new Schema<PostTemplateDocument>(
  {
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    format: { type: String, enum: ['text', 'card', 'json'], required: true },
    content: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);
PostTemplateSchemaMongoose.index({ guildId: 1, name: 1 }, { unique: true });

export const PersonaModel = mongoose.model<PersonaDocument>('Persona', PersonaSchemaMongoose);
export const PostTemplateModel = mongoose.model<PostTemplateDocument>('PostTemplate', PostTemplateSchemaMongoose);
