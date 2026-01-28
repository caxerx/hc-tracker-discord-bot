import { Client, Events, MessageFlags } from 'discord.js';
import type { Interaction, ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { channelSettingService } from '../service/channel-setting';
import { ChannelType } from '../generated/prisma/enums';

// Import individual command handlers
import { handleDoneInteraction, matchesDoneInteraction } from '../commands/done/handler';
import { handleRegInteraction, matchesRegInteraction } from '../commands/reg/handler';
import { handleQueryInteraction, matchesQueryInteraction } from '../commands/query/handler';
import { handleLodInteraction, matchesLodInteraction } from '../commands/lod/handler';
import { handleReportInteraction, matchesReportInteraction } from '../commands/report/handler';
import { handleWeeklyReportInteraction, matchesWeeklyReportInteraction } from '../commands/weekly-report/handler';
import { handleMonthlyReportInteraction, matchesMonthlyReportInteraction } from '../commands/monthly-report/handler';
import { handleRenameInteraction, matchesRenameInteraction } from '../commands/rename/handler';

// Commands allowed in submission channels
const allowedInSubmissionChannels = new Set(['query', 'reg', 'done']);

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

interface CommandHandler {
  matcher: (interaction: AnyInteraction) => boolean;
  handler: (interaction: AnyInteraction) => Promise<void>;
}

// Type-safe wrapper for creating handlers
function createHandler<T extends AnyInteraction>(
  matcher: (interaction: AnyInteraction) => boolean,
  handler: (interaction: T) => Promise<void>
): CommandHandler {
  return {
    matcher,
    handler: (interaction: AnyInteraction) => handler(interaction as T)
  };
}

// Registry of command handlers with their matchers
const commandHandlers: CommandHandler[] = [
  createHandler(matchesDoneInteraction, handleDoneInteraction),
  createHandler(matchesRegInteraction, handleRegInteraction),
  createHandler(matchesQueryInteraction, handleQueryInteraction),
  createHandler(matchesLodInteraction, handleLodInteraction),
  createHandler(matchesReportInteraction, handleReportInteraction),
  createHandler(matchesWeeklyReportInteraction, handleWeeklyReportInteraction),
  createHandler(matchesMonthlyReportInteraction, handleMonthlyReportInteraction),
  createHandler(matchesRenameInteraction, handleRenameInteraction),
];

async function handleInteraction(interaction: Interaction): Promise<void> {
  // Handle chat input commands
  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction);
  }
  // Handle button interactions
  else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  }
  // Handle string select menu interactions
  else if (interaction.isStringSelectMenu()) {
    await handleStringSelectMenuInteraction(interaction);
  }
}

async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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

  // Find and execute the appropriate handler
  for (const { matcher, handler } of commandHandlers) {
    if (matcher(interaction)) {
      await handler(interaction);
      return;
    }
  }

  console.warn(`Unknown command: ${commandName}`);
}

async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  // Find and execute the appropriate handler
  for (const { matcher, handler } of commandHandlers) {
    if (matcher(interaction)) {
      await handler(interaction);
      return;
    }
  }

  console.warn(`Unknown button: ${interaction.customId}`);
}

async function handleStringSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
  // Find and execute the appropriate handler
  for (const { matcher, handler } of commandHandlers) {
    if (matcher(interaction)) {
      await handler(interaction);
      return;
    }
  }

  console.warn(`Unknown select menu: ${interaction.customId}`);
}

export function handlerInteraction(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    await handleInteraction(interaction);
  });
}
