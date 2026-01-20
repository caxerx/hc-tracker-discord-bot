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
import { RaidType } from '../../generated/prisma/enums';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { getRaidCompletionCountReport } from '../../generated/prisma/sql/getRaidCompletionCountReport';

interface WeeklyReportSessionData {
  userId: string;
  selectedWeek?: string;
  selectedRaid?: RaidType;
  step: 'week_selection' | 'raid_selection' | 'complete';
}

const weeklyReportSessions = new Map<string, WeeklyReportSessionData>();

export async function handleWeeklyReportCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const userId = interaction.user.id;

  // Initialize session
  weeklyReportSessions.set(userId, {
    userId,
    step: 'week_selection',
  });

  // Step 1: Ask for week selection
  await showWeekSelection(interaction);
}

async function showWeekSelection(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // Generate last 6 weeks for selection (weeks start on Monday)
  const weeks: { label: string; value: string }[] = [];
  const today = new Date();

  for (let i = 0; i < 6; i++) {
    const targetDate = addWeeks(today, -i);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // 1 = Monday
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const label = `${weekStartStr} to ${weekEndStr}`;

    weeks.push({ label, value: weekStartStr });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`weekly_report_week_select_${interaction.user.id}`)
      .setPlaceholder('請選擇週')
      .addOptions(weeks)
  );

  await interaction.reply({
    content: '請選擇週 (週一至週日):',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function showRaidSelection(
  interaction: StringSelectMenuInteraction,
  session: WeeklyReportSessionData
): Promise<void> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`weekly_report_raid_select_${session.userId}`)
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

async function generateWeeklyReport(
  interaction: StringSelectMenuInteraction,
  session: WeeklyReportSessionData
): Promise<void> {
  if (!session.selectedWeek || !session.selectedRaid) {
    await interaction.update({
      content: '發生錯誤: 缺少週或 Raid 類型選擇.',
      components: [],
    });
    weeklyReportSessions.delete(session.userId);
    return;
  }

  try {
    // Parse the selected week start date (format: YYYY-MM-DD)
    const weekStartDate = new Date(session.selectedWeek);
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday

    // Query to get all registered characters and their completion counts
    // - Multiple completions on the same day only count as 1
    // - Same character name by different discord users only count as 1
    // - Shows all characters including those with 0 completions
    const results = await prisma.$queryRawTyped(
      getRaidCompletionCountReport(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        session.selectedRaid
      )
    );

    // Format the report
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    let reportMessage = `**Weekly HC Report: ${session.selectedRaid} (${weekStartStr} to ${weekEndStr})**\n`;
    reportMessage += '```\n';

    if (results.length > 0) {
      for (const row of results) {
        reportMessage += `${row.completionCount} ${row.characterName}\n`;
      }
    } else {
      reportMessage += '(no registered characters)';
    }

    reportMessage += '```';

    // Send the report as a public message
    await (interaction.channel as TextChannel)?.send(reportMessage);

    // Update the ephemeral message to confirm
    await interaction.update({
      content: '報告生成成功!',
      components: [],
    });

    weeklyReportSessions.delete(session.userId);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    await interaction.update({
      content: '發生錯誤: 生成報告時發生錯誤. 請稍後再試.',
      components: [],
    });
    weeklyReportSessions.delete(session.userId);
  }
}

export async function handleWeeklyReportSelectMenu(
  interaction: StringSelectMenuInteraction | ButtonInteraction
): Promise<void> {
  const userId = interaction.user.id;
  const session = weeklyReportSessions.get(userId);

  if (!session) {
    await interaction.reply({
      content: '已過期. 請重新執行 /weeklyreport 指令.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;

    // Handle week selection
    if (customId.startsWith('weekly_report_week_select_')) {
      session.selectedWeek = interaction.values[0];
      session.step = 'raid_selection';
      await showRaidSelection(interaction, session);
    }
    // Handle raid selection
    else if (customId.startsWith('weekly_report_raid_select_')) {
      session.selectedRaid = interaction.values[0] as RaidType;
      session.step = 'complete';
      await generateWeeklyReport(interaction, session);
    }
  }
}

// Interaction handler registry
export function handleWeeklyReportInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleWeeklyReportCommand(interaction);
  }

  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    return handleWeeklyReportSelectMenu(interaction);
  }

  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesWeeklyReportInteraction(
  interaction: AnyInteraction
): boolean {
  if (interaction.isChatInputCommand()) {
    return interaction.commandName === 'weeklyreport';
  }

  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    return interaction.customId.startsWith('weekly_report_');
  }

  return false;
}
