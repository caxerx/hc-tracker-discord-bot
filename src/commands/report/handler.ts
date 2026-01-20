import type {
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  TextChannel,
} from 'discord.js';
import {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
import { prisma } from '../../db';
import { getRaidCompletionReport } from '../../generated/prisma/sql';
import { RaidType } from '../../generated/prisma/enums';
import { addDays, format } from 'date-fns';
import { getUtcToday } from '../../utils/date';

interface ReportSessionData {
  userId: string;
  selectedDate?: string;
  selectedRaid?: RaidType;
  step: 'date_selection' | 'raid_selection' | 'complete';
}

const reportSessions = new Map<string, ReportSessionData>();

export async function handleReportCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const userId = interaction.user.id;

  // Initialize session
  reportSessions.set(userId, {
    userId,
    step: 'date_selection',
  });

  // Step 1: Ask for date selection
  await showDateSelection(interaction);
}

async function showDateSelection(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // Generate last 7 days for selection
  const dates: { label: string; value: string }[] = [];
  const today = getUtcToday();

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, -i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dateStr;
    dates.push({ label, value: dateStr });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`report_date_select_${interaction.user.id}`)
      .setPlaceholder('請選擇日期')
      .addOptions(dates)
  );

  await interaction.reply({
    content: '請選擇日期:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function showRaidSelection(
  interaction: StringSelectMenuInteraction,
  session: ReportSessionData
): Promise<void> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`report_raid_select_${session.userId}`)
      .setPlaceholder('請選擇 Raid 類型')
      .addOptions([
        {
          label: 'Kirollas',
          value: RaidType.Kirollas,
          description: '靈王',
        },
        {
          label: 'Carno',
          value: RaidType.Carno,
          description: '獸王',
        },
      ])
  );

  await interaction.update({
    content: '請選擇 Raid 類型:',
    components: [row],
  });
}

async function generateReport(
  interaction: StringSelectMenuInteraction,
  session: ReportSessionData
): Promise<void> {
  if (!session.selectedDate || !session.selectedRaid) {
    await interaction.update({
      content: '發生錯誤: 缺少日期或 Raid 類型選擇.',
      components: [],
    });
    reportSessions.delete(session.userId);
    return;
  }

  try {
    // Use TypedSQL for better performance and type safety
    // Get all unique characters (grouped by character name) that are registered for the selected date
    // and check if any discord user completed the raid for that character
    const result = await prisma.$queryRawTyped(
      getRaidCompletionReport(
        format(new Date(session.selectedDate), 'yyyy-MM-dd'),
        session.selectedRaid
      )
    );

    const finishedCharacters: string[] = [];
    const notFinishedCharacters: string[] = [];

    for (const row of result) {
      if (row.isCompleted) {
        finishedCharacters.push(row.characterName);
      } else {
        notFinishedCharacters.push(row.characterName);
      }
    }

    const dateFormatted = new Date(session.selectedDate).toISOString().split('T')[0];

    const totalCharacters = finishedCharacters.length + notFinishedCharacters.length;

    let reportMessage = `**HC Report: ${session.selectedRaid} (${dateFormatted})**\n`;
    reportMessage += `**Finished (${finishedCharacters.length}/${totalCharacters})**\n`;
    reportMessage += '```\n';
    if (finishedCharacters.length > 0) {
      reportMessage += finishedCharacters.join('\n');
    } else {
      reportMessage += '(none)';
    }
    reportMessage += '\n```\n\n';
    reportMessage += `**Not Finished (${notFinishedCharacters.length}/${totalCharacters})**\n`;
    reportMessage += '```\n';
    if (notFinishedCharacters.length > 0) {
      reportMessage += notFinishedCharacters.join('\n');
    } else {
      reportMessage += '(none)';
    }
    reportMessage += '\n```';

    // Send the report as a public message
    await (interaction.channel as TextChannel)?.send(reportMessage);

    // Update the ephemeral message to confirm
    await interaction.update({
      content: '報告生成成功!',
      components: [],
    });

    reportSessions.delete(session.userId);
  } catch (error) {
    console.error('Error generating report:', error);
    await interaction.update({
      content: '發生錯誤: 生成報告時發生錯誤. 請稍後再試.',
      components: [],
    });
    reportSessions.delete(session.userId);
  }
}

export async function handleReportSelectMenu(
  interaction: StringSelectMenuInteraction | ButtonInteraction
): Promise<void> {
  const userId = interaction.user.id;
  const session = reportSessions.get(userId);

  if (!session) {
    await interaction.reply({
      content: '已過期. 請重新執行 /report 指令.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;

    // Handle date selection
    if (customId.startsWith('report_date_select_')) {
      session.selectedDate = interaction.values[0];
      session.step = 'raid_selection';
      await showRaidSelection(interaction, session);
    }
    // Handle raid selection
    else if (customId.startsWith('report_raid_select_')) {
      session.selectedRaid = interaction.values[0] as RaidType;
      session.step = 'complete';
      await generateReport(interaction, session);
    }
  }
}

// Interaction handler registry
export function handleReportInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleReportCommand(interaction);
  }

  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    return handleReportSelectMenu(interaction);
  }

  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesReportInteraction(
  interaction: AnyInteraction
): boolean {
  if (interaction.isChatInputCommand()) {
    return interaction.commandName === 'report';
  }

  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    return interaction.customId.startsWith('report_');
  }

  return false;
}
