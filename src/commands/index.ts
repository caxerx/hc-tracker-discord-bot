import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { handleDoneCommand, handleDoneButton, handleStartRaidWorkflow } from './done';
import { handleRegCommand } from './reg';
import { handleReportCommand, handleReportInteraction } from './report';
import { handleWeeklyReportCommand, handleWeeklyReportInteraction } from './weekly-report';
import { handleMonthlyReportCommand, handleMonthlyReportInteraction } from './monthly-report';
import { handleQueryCommand } from './query';
import { handleStartRaidWorkflowAllCharsYes } from '../service/image-submission';

const commandHandlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
  done: handleDoneCommand,
  reg: handleRegCommand,
  report: handleReportCommand,
  weeklyreport: handleWeeklyReportCommand,
  monthlyreport: handleMonthlyReportCommand,
  query: handleQueryCommand,
};

const buttonHandlers: Record<string, (interaction: ButtonInteraction) => Promise<void>> = {};

const selectMenuHandlers: Record<string, (interaction: StringSelectMenuInteraction) => Promise<void>> = {};

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = commandHandlers[interaction.commandName];
  if (handler) {
    await handler(interaction);
  } else {
    console.warn(`Unknown command: ${interaction.commandName}`);
  }
}

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  // Check for exact match first
  let handler = buttonHandlers[customId];

  // If no exact match, check for dynamic handlers
  if (!handler && customId.startsWith('done_')) {
    handler = handleDoneButton;
  } else if (!handler && customId.startsWith('report_')) {
    handler = handleReportInteraction;
  } else if (!handler && customId.startsWith('start_raid_workflow_allchars_yes_')) {
    handler = handleStartRaidWorkflowAllCharsYes;
  } else if (!handler && customId.startsWith('start_raid_workflow_')) {
    handler = handleStartRaidWorkflow;
  }

  if (handler) {
    await handler(interaction);
  } else {
    console.warn(`Unknown button: ${customId}`);
  }
}

export async function handleStringSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const customId = interaction.customId;

  // Check for exact match first
  let handler = selectMenuHandlers[customId];

  // If no exact match, check for dynamic handlers
  if (!handler && customId.startsWith('done_')) {
    handler = handleDoneButton;
  } else if (!handler && customId.startsWith('report_')) {
    handler = handleReportInteraction;
  } else if (!handler && customId.startsWith('weekly_report_')) {
    handler = handleWeeklyReportInteraction;
  } else if (!handler && customId.startsWith('monthly_report_')) {
    handler = handleMonthlyReportInteraction;
  }

  if (handler) {
    await handler(interaction);
  } else {
    console.warn(`Unknown select menu: ${customId}`);
  }
}
