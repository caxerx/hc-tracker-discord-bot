import type {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { MessageFlags } from 'discord.js';
import { fallbackT as t } from '../../i18n';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
import {
  startRaidCompletionWorkflow,
  handleRaidCompletionButton,
} from '../../service/raid-completion-workflow';
import { handleStartRaidWorkflowAllCharsYes, handleCompleteAllFromDetection } from '../../service/image-submission';

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
  const originalMessage = await interaction.channel?.messages.fetch(
    interaction.message.reference?.messageId
  );
  if (!originalMessage) return;

  if (interaction.user.id !== originalMessage?.author?.id) {
    await interaction.reply({
      content: t('general.youCannotUseThisButton'),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Parse requireDateSelection from customId (format: start_raid_workflow_{userId}_{requireDateSelection})
  const customIdParts = interaction.customId.split('_');
  const requireDateSelection = customIdParts[customIdParts.length - 1] === 'true';
  await startRaidCompletionWorkflow(
    interaction,
    interaction.user.id,
    requireDateSelection
  );
}

// Interaction handler registry
export function handleDoneInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleDoneCommand(interaction);
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('done_')) {
      return handleDoneButton(interaction);
    } else if (customId.startsWith('start_raid_workflow_allchars_yes_')) {
      return handleStartRaidWorkflowAllCharsYes(interaction);
    } else if (customId.startsWith('complete_all_from_detection_')) {
      return handleCompleteAllFromDetection(interaction);
    } else if (customId.startsWith('start_raid_workflow_')) {
      return handleStartRaidWorkflow(interaction);
    }
  }

  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    if (customId.startsWith('done_')) {
      return handleDoneButton(interaction);
    }
  }

  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesDoneInteraction(
  interaction: AnyInteraction
): boolean {
  if (interaction.isChatInputCommand()) {
    return interaction.commandName === 'done';
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    return (
      customId.startsWith('done_') ||
      customId.startsWith('start_raid_workflow_allchars_yes_') ||
      customId.startsWith('complete_all_from_detection_') ||
      customId.startsWith('start_raid_workflow_')
    );
  }

  if (interaction.isStringSelectMenu()) {
    return interaction.customId.startsWith('done_');
  }

  return false;
}
