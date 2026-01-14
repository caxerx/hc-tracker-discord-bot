import {
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { startRaidCompletionWorkflow, handleRaidCompletionButton } from '../service/raid-completion-workflow';

export async function handleDoneCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // Always require date selection for /done command
  await startRaidCompletionWorkflow(interaction, interaction.user.id, true);
}

export async function handleDoneButton(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  await handleRaidCompletionButton(interaction);
}

export async function handleStartRaidWorkflow(
  interaction: ButtonInteraction
): Promise<void> {
  if (!interaction.message.reference?.messageId) return;
  const originalMessage = await interaction.channel?.messages.fetch(interaction.message.reference?.messageId);
  if (!originalMessage) return;

  if (interaction.user.id !== originalMessage?.author?.id) {
    await interaction.reply({
      content: '你不能使用這個按鈕.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Parse requireDateSelection from customId (format: start_raid_workflow_{userId}_{requireDateSelection})
  const customIdParts = interaction.customId.split('_');
  const requireDateSelection = customIdParts[customIdParts.length - 1] === 'true';
  await startRaidCompletionWorkflow(interaction, interaction.user.id, requireDateSelection);
}