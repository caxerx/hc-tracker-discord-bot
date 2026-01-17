import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { handleDoneCommand, handleDoneButton, handleStartRaidWorkflow } from './done';
import { handleRegCommand } from './reg';
import { handleReportCommand, handleReportInteraction } from './report';
import { handleWeeklyReportCommand, handleWeeklyReportInteraction } from './weekly-report';
import { handleMonthlyReportCommand, handleMonthlyReportInteraction } from './monthly-report';
import { handleQueryCommand } from './query';
import { handleLodCommand } from './lod';
import { handleStartRaidWorkflowAllCharsYes } from '../service/image-submission';
import { channelSettingService } from '../service/channel-setting';
import { ChannelType } from '../generated/prisma/enums';

const commandHandlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
  done: handleDoneCommand,
  reg: handleRegCommand,
  report: handleReportCommand,
  weeklyreport: handleWeeklyReportCommand,
  monthlyreport: handleMonthlyReportCommand,
  query: handleQueryCommand,
  lod: handleLodCommand,
};

// Commands allowed in submission channels
const allowedInSubmissionChannels = new Set(['query', 'reg', 'done']);

const buttonHandlers: Record<string, (interaction: ButtonInteraction) => Promise<void>> = {};

const selectMenuHandlers: Record<string, (interaction: StringSelectMenuInteraction) => Promise<void>> = {};

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const commandName = interaction.commandName;

  // Check if this is a submission channel
  const isSubmissionChannel =
    channelSettingService.hasChannelType(channelId, ChannelType.TodaySubmission) ||
    channelSettingService.hasChannelType(channelId, ChannelType.OtherDateSubmission);

  // Block commands that are not allowed in submission channels
  if (isSubmissionChannel && !allowedInSubmissionChannels.has(commandName)) {
    await interaction.reply({
      content: '此指令不能在提交頻道中使用。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const handler = commandHandlers[commandName];
  if (handler) {
    await handler(interaction);
  } else {
    console.warn(`Unknown command: ${commandName}`);
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
