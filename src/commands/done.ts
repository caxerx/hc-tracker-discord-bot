import type {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
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
  // Parse requireDateSelection from customId (format: start_raid_workflow_{userId}_{requireDateSelection})
  const customIdParts = interaction.customId.split('_');
  const requireDateSelection = customIdParts[customIdParts.length - 1] === 'true';
  await startRaidCompletionWorkflow(interaction, interaction.user.id, requireDateSelection);
}