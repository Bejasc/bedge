import { InteractionHandler, InteractionHandlerTypes, container } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { AvailabilityConfigModel } from '@bedge/database';
import { AvailabilityWindowsInputSchema } from '@bedge/types';

export class AvailabilitySetModalHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith('availability-advanced:')) return this.none();
    return this.some();
  }

  public async run(interaction: ModalSubmitInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const memberId = parts[1];
    const guildId = parts[2];
    const jsonStr = interaction.fields.getTextInputValue('json');

    container.logger.debug(
      `availability-set modal: guild=${guildId} member=${memberId} json length=${jsonStr.length}`,
    );

    let raw: unknown;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      await interaction.reply({
        content: '❌ Invalid JSON — check your syntax and try again.',
        ephemeral: true,
      });
      return;
    }

    const result = AvailabilityWindowsInputSchema.safeParse(raw);
    if (!result.success) {
      const errors = result.error.issues
        .map((e) => `• \`${e.path.join('.')}\`: ${e.message}`)
        .join('\n');
      container.logger.debug(`availability-set modal: validation failed for member=${memberId}\n${errors}`);
      await interaction.reply({
        content: `❌ Config validation failed:\n${errors}`,
        ephemeral: true,
      });
      return;
    }

    const { broad, weekdays } = result.data;

    container.logger.debug(
      `availability-set modal: validated — member=${memberId} broad=${broad.length} weekdays=${Object.keys(weekdays).length}`,
    );

    await AvailabilityConfigModel.findOneAndUpdate(
      { guildId, memberId },
      { $set: { broad, weekdays } },
      { upsert: true },
    );

    await interaction.reply({
      content: `✅ Availability config updated for <@${memberId}>.`,
      ephemeral: true,
    });
  }
}
