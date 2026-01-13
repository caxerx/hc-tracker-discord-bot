import {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Message,
  User,
} from 'discord.js';
import {
  type ChatInputCommandInteraction,
  ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { prisma } from '../db';
import { RaidType } from '../generated/prisma/enums';
import { regCommandMention } from '../commands';
import { addDays, format, startOfDay } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { getUtcToday } from '../utils/date';

export interface SessionData {
  userId: string;
  completedBothRaids: boolean;
  selectedRaid?: RaidType;
  completedAllCharacters: boolean;
  selectedCharacterIds?: string[];
  step: 'initial' | 'raid_selection' | 'character_confirmation' | 'character_selection' | 'date_selection';
  evidenceMessageId?: string;
  messageId?: string;
  selectedDate?: Date;
  requireDateSelection?: boolean;
}

const sessions = new Map<string, SessionData>();

/**
 * Starts the raid completion workflow for a user
 * Can be triggered by either a slash command or a message
 */
export async function startRaidCompletionWorkflow(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  userId: string,
  requireDateSelection: boolean = false,
  skipToCompletion: boolean = false
): Promise<void> {
  // Initialize session
  sessions.set(userId, {
    userId,
    completedBothRaids: skipToCompletion ? true : false,
    completedAllCharacters: skipToCompletion ? true : false,
    step: requireDateSelection ? 'date_selection' : 'initial',
    evidenceMessageId: interaction instanceof ButtonInteraction ? interaction.message.reference?.messageId : undefined,
    messageId: interaction instanceof ButtonInteraction ? interaction.message.id : undefined,
    requireDateSelection,
  });

  // If date selection is required, show date picker first
  if (requireDateSelection) {
    await askDateSelection(interaction, userId);
    return;
  }

  // If skipToCompletion is true, complete the tracking immediately
  if (skipToCompletion) {
    const session = sessions.get(userId);
    if (session) {
      await completeRaidTracking(interaction as ButtonInteraction, session);
    }
    return;
  }

  // Step 1: Ask if completed both raids
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`done_both_yes_${userId}`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`done_both_no_${userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: '你已經完成Kirollas + Carno了嗎?',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function askDateSelection(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  userId: string
): Promise<void> {
  // Generate last 7 days as options
  const today = startOfDay(new Date());

  const dates: { label: string; value: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, -i);
    const dateStr = format(date, 'yyyy-MM-dd');

    const label = i === 0 ? `今天 (${dateStr})` : i === 1 ? `昨天 (${dateStr})` : dateStr;

    dates.push({
      label,
      value: dateStr,
    });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`done_date_select_${userId}`)
      .setPlaceholder('選擇日期')
      .addOptions(dates)
  );

  await interaction.reply({
    content: '請選擇Raid完成日期:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function askBothRaidsCompleted(
  interaction: StringSelectMenuInteraction,
  session: SessionData
): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`done_both_yes_${session.userId}`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`done_both_no_${session.userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    content: '你已經完成Kirollas + Carno了嗎?',
    components: [row],
  });
}

export async function handleRaidCompletionButton(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  const userId = interaction.user.id;
  const session = sessions.get(userId);

  if (!session) {
    await interaction.reply({
      content: '對話已過期. 請重新開始.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Handle "Did you complete both raids?" response
    if (customId.startsWith('done_both_yes_')) {
      session.completedBothRaids = true;
      session.step = 'character_confirmation';
      await askAllCharactersCompleted(interaction, session);
    } else if (customId.startsWith('done_both_no_')) {
      session.completedBothRaids = false;
      session.step = 'raid_selection';
      await askWhichRaid(interaction, session);
    }
    // Handle "Have you completed on all characters?" response
    else if (customId.startsWith('done_allchars_yes_')) {
      session.completedAllCharacters = true;
      await completeRaidTracking(interaction, session);
    } else if (customId.startsWith('done_allchars_no_')) {
      session.completedAllCharacters = false;
      session.step = 'character_selection';
      await askCharacterSelection(interaction, session);
    }
    // Handle character selection confirmation
    else if (customId.startsWith('done_chars_confirm_')) {
      await completeRaidTracking(interaction, session);
    }
  } else if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;

    // Handle date selection
    if (customId.startsWith('done_date_select_')) {
      const selectedDateStr = interaction.values[0];
      if (!selectedDateStr) {
        await interaction.update({
          content: '請選擇一個日期.',
          components: [],
        });
        return;
      }
      session.selectedDate = startOfDay(new TZDate(selectedDateStr, "UTC"));
      session.step = 'initial';

      // If both raids and all characters are already marked as completed, skip to completion
      if (session.completedBothRaids && session.completedAllCharacters) {
        await completeRaidTracking(interaction as any, session);
      } else {
        await askBothRaidsCompleted(interaction, session);
      }
    }
    // Handle raid selection
    else if (customId.startsWith('done_raid_select_')) {
      const selectedRaid = interaction.values[0] as RaidType;
      session.selectedRaid = selectedRaid;
      session.step = 'character_confirmation';
      await askAllCharactersCompleted(interaction, session);
    }
    // Handle character selection
    else if (customId.startsWith('done_char_select_')) {
      session.selectedCharacterIds = interaction.values;
      await showCharacterConfirmation(interaction, session);
    }
  }
}

async function askWhichRaid(
  interaction: ButtonInteraction,
  session: SessionData
): Promise<void> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`done_raid_select_${session.userId}`)
      .setPlaceholder('選擇你完成的Raid')
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
    content: '你完成了哪個Raid?',
    components: [row],
  });
}

async function askAllCharactersCompleted(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  session: SessionData
): Promise<void> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`done_allchars_yes_${session.userId}`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`done_allchars_no_${session.userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    content: '你完成了所有角色的HC嗎?',
    components: [row],
  });
}

async function askCharacterSelection(
  interaction: ButtonInteraction,
  session: SessionData
): Promise<void> {
  try {
    // Fetch user's registered characters
    const characters = await prisma.registerCharacter.findMany({
      where: {
        registerDiscordUserId: session.userId,
        unregisterDate: {
          gte: new Date(),
        },
      },
    });

    if (characters.length === 0) {
      await interaction.update({
        content: `你沒有註冊任何角色. 請先使用 ${regCommandMention} 綁定角色.`,
        components: [],
      });
      sessions.delete(session.userId);
      return;
    }

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`done_char_select_${session.userId}`)
        .setPlaceholder('選擇你完成的角色')
        .setMinValues(1)
        .setMaxValues(Math.min(characters.length, 25))
        .addOptions(
          characters.map((char) => ({
            label: char.characterName,
            value: char.id,
            description: `已選擇: ${char.characterName}`,
          }))
        )
    );

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`done_chars_confirm_${session.userId}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
    );

    await interaction.update({
      content: '選擇你完成的角色, 然後點擊確認:',
      components: [selectRow, buttonRow],
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    await interaction.update({
      content: '發生錯誤. <@161038123529142272>',
      components: [],
    });
    sessions.delete(session.userId);
  }
}

async function showCharacterConfirmation(
  interaction: StringSelectMenuInteraction,
  session: SessionData
): Promise<void> {
  try {
    // Fetch all registered characters to rebuild the select menu
    const allCharacters = await prisma.registerCharacter.findMany({
      where: {
        registerDiscordUserId: session.userId,
        unregisterDate: {
          gte: new Date(),
        },
      },
    });

    // Fetch selected characters for display
    const selectedCharacters = await prisma.registerCharacter.findMany({
      where: {
        id: {
          in: session.selectedCharacterIds,
        },
      },
    });

    const characterNames = selectedCharacters.map((char) => char.characterName).join(', ');

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`done_char_select_${session.userId}`)
        .setPlaceholder('選擇你完成的角色')
        .setMinValues(1)
        .setMaxValues(Math.min(allCharacters.length, 25))
        .addOptions(
          allCharacters.map((char) => ({
            label: char.characterName,
            value: char.id,
            description: `已選擇: ${char.characterName}`,
          }))
        )
    );

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`done_chars_confirm_${session.userId}`)
        .setLabel('確認')
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    );

    await interaction.update({
      content: `已選擇: ${characterNames}\n點擊確認保存, 或更改你的選擇.`,
      components: [selectRow, buttonRow],
    });
  } catch (error) {
    console.error('Error showing confirmation:', error);
    await interaction.update({
      content: '發生錯誤. <@161038123529142272>',
      components: [],
    });
    sessions.delete(session.userId);
  }
}

/**
 * Creates raid completion records in the database
 * @param discordUserId Discord user ID (required if characterIds is null)
 * @param characterIds Array of character IDs that completed the raid(s), or null to use all active characters
 * @param completedBothRaids Whether both raids were completed
 * @param selectedRaid The specific raid type if only one was completed
 * @param raidDate The date of the raid completion
 * @returns The number of records created
 */
async function createRaidCompletionRecords(
  discordUserId: string,
  characterIds: string[] | null,
  completedBothRaids: boolean,
  selectedRaid: RaidType | undefined,
  raidDate: Date
): Promise<number> {
  let targetCharacterIds: string[];

  if (characterIds === null) {
    // Fetch all active characters for the user
    const characters = await prisma.registerCharacter.findMany({
      where: {
        registerDiscordUserId: discordUserId,
        unregisterDate: {
          gte: new Date(),
        },
      },
    });

    targetCharacterIds = characters.map((char) => char.id);
  } else {
    targetCharacterIds = characterIds;
  }

  const completionRecords: Array<{ characterId: string; raidDate: Date; raidType: RaidType }> = [];

  if (completedBothRaids) {
    // Create records for both Kiro and Carno
    for (const charId of targetCharacterIds) {
      completionRecords.push(
        { characterId: charId, raidDate, raidType: RaidType.Kirollas },
        { characterId: charId, raidDate, raidType: RaidType.Carno }
      );
    }
  } else {
    // Create records for only the selected raid
    const raidType = selectedRaid!;
    for (const charId of targetCharacterIds) {
      completionRecords
        .push({ characterId: charId, raidDate, raidType });
    }
  }

  await prisma.raidCompletion.createMany({
    data: completionRecords,
    skipDuplicates: true,
  });

  return completionRecords.length;
}

export async function completeRaidTracking(
  interaction: ButtonInteraction,
  session: SessionData
): Promise<void> {
  try {
    // Use selected date if available, otherwise use raidDate
    const raidDate = session.selectedDate || getUtcToday();
    console.log(raidDate);

    let characterIds: string[] | null = null;

    if (session.completedAllCharacters) {
      // Pass null to fetch all registered characters
      characterIds = null;
    } else {
      if (!session.selectedCharacterIds || session.selectedCharacterIds.length === 0) {
        await interaction.update({
          content: '沒有選擇角色. 請重新選擇.',
          components: [],
        });
        sessions.delete(session.userId);
        return;
      }
      characterIds = session.selectedCharacterIds;
    }

    // Create raid completion records
    const recordCount = await createRaidCompletionRecords(
      session.userId,
      characterIds,
      session.completedBothRaids,
      session.selectedRaid,
      raidDate
    );

    if (session.evidenceMessageId) {
      await createRaidCompletionEvidence(
        session.userId,
        raidDate,
        session.evidenceMessageId
      );
    }

    if (recordCount === 0) {
      await interaction.update({
        content: `你沒有註冊任何角色. 請先使用 ${regCommandMention} 綁定角色.`,
        components: [],
      });
      sessions.delete(session.userId);
      return;
    }

    await interaction.update({
      content: `成功記錄完成.`,
      components: [],
    });

    if (session.messageId) {
      await interaction.channel?.messages.fetch(session.messageId).then((message) => {
        message.edit({
          content: `成功記錄完成.`,
          components: [],
        });
      });
    }

    sessions.delete(session.userId);
  } catch (error) {
    console.error('Error completing raid tracking:', error);
    await interaction.update({
      content: '發生錯誤. <@161038123529142272>',
      components: [],
    });

    sessions.delete(session.userId);
  }
}


async function createRaidCompletionEvidence(
  discordUserId: string,
  raidDate: Date,
  messageId: string
): Promise<void> {
  await prisma.raidCompletionEvidence.create({
    data: {
      discordUserId,
      raidDate,
      messageId,
    },
  });
}