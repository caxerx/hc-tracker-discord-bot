import {
  MessageFlags,
} from 'discord.js';
import type {
  ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../db';
import { RaidType } from '../generated/prisma/enums';
import { TZDate } from '@date-fns/tz';

export async function handleQueryCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const characterName = interaction.options.getString('character_name', true);
  const dateStr = interaction.options.getString('date', true);

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    await interaction.reply({
      content: '日期格式錯誤. 請使用 YYYY-MM-DD 格式 (例如: 2026-01-15)',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const queryDate = new TZDate(dateStr, "UTC");

  // Check if date is valid
  if (isNaN(queryDate.getTime())) {
    await interaction.reply({
      content: '無效的日期. 請輸入有效的日期.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Query to get all completions for this character name on this date
    // along with the Discord user information and evidence
    const completions = await prisma.$queryRaw<
      Array<{
        raidType: RaidType;
        discordUserId: string;
        characterId: string;
      }>
    >`
      SELECT DISTINCT
        rc."raidType",
        reg."registerDiscordUserId" as "discordUserId",
        reg."id" as "characterId"
      FROM "RaidCompletion" rc
      INNER JOIN "RegisterCharacter" reg ON rc."characterId" = reg.id
      WHERE reg."characterName" = ${characterName}
        AND rc."raidDate" = ${queryDate}::date
      ORDER BY rc."raidType", reg."registerDiscordUserId"
    `;

    if (completions.length === 0) {
      await interaction.reply({
        content: `在 ${dateStr} 找不到角色 "${characterName}" 的完成紀錄.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Get evidence for all Discord users on this date
    const discordUserIds = [...new Set(completions.map(c => c.discordUserId))];
    const evidences = await prisma.raidCompletionEvidence.findMany({
      where: {
        discordUserId: {
          in: discordUserIds,
        },
        raidDate: queryDate,
      },
    });

    // Build the response message
    let responseMessage = `**角色: ${characterName} (${dateStr})**\n\n`;

    // Group by discord user
    const completionsByUser = new Map<string, RaidType[]>();
    for (const completion of completions) {
      if (!completionsByUser.has(completion.discordUserId)) {
        completionsByUser.set(completion.discordUserId, []);
      }
      completionsByUser.get(completion.discordUserId)!.push(completion.raidType);
    }

    // Display information for each Discord user
    for (const [discordUserId, raidTypes] of completionsByUser) {
      responseMessage += `**Discord 用戶: <@${discordUserId}>**\n`;
      responseMessage += `完成的 Raids: ${raidTypes.join(', ')}\n`;

      // Find evidence for this user
      const userEvidence = evidences.filter(e => e.discordUserId === discordUserId);
      if (userEvidence.length > 0) {
        responseMessage += '提交記錄:\n';
        for (const evidence of userEvidence) {
          responseMessage += `- ${evidence.messageUrl}\n`;
        }
      } else {
        responseMessage += '提交記錄: 無紀錄\n';
      }
      responseMessage += '\n';
    }

    await interaction.reply({
      content: responseMessage,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error querying raid completion:', error);
    await interaction.reply({
      content: '發生錯誤: 查詢時發生錯誤. 請稍後再試.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
