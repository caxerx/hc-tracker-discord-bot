import {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  TextChannel,
  type Interaction,
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
import { getServerToday } from '../utils/date';
import { fallbackT as t } from '../i18n';

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
  skipToCompletion: boolean = false,
  overrideEvidenceMessageId?: string
): Promise<void> {
  // Initialize session
  sessions.set(userId, {
    userId,
    completedBothRaids: skipToCompletion ? true : false,
    completedAllCharacters: skipToCompletion ? true : false,
    step: requireDateSelection ? 'date_selection' : 'initial',
    evidenceMessageId: overrideEvidenceMessageId || (interaction instanceof ButtonInteraction ? interaction.message.reference?.messageId : undefined),
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
    content: t('raidCompletionWorkflow.youHaveCompletedBothRaids'),
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

    const label = i === 0 ? t('raidCompletionWorkflow.today', [dateStr]) : i === 1 ? t('raidCompletionWorkflow.yesterday', [dateStr]) : dateStr;

    dates.push({
      label,
      value: dateStr,
    });
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`done_date_select_${userId}`)
      .setPlaceholder(t('raidCompletionWorkflow.selectDate'))
      .addOptions(dates)
  );

  await interaction.reply({
    content: t('raidCompletionWorkflow.pleaseSelectRaidDate'),
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
    content: t('raidCompletionWorkflow.youHaveCompletedBothRaids'),
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
      content: t('general.sessionExpired'),
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
          content: t('raidCompletionWorkflow.pleaseSelectValidDate'),
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
      .setPlaceholder(t('raidCompletionWorkflow.selectCompletedRaid'))
      .addOptions([
        {
          label: t('raidType.kirollas.simpleName'),
          value: RaidType.Kirollas,
          description: t('raidType.kirollas.originalName'),
        },
        {
          label: t('raidType.carno.simpleName'),
          value: RaidType.Carno,
          description: t('raidType.carno.originalName'),
        },
      ])
  );

  await interaction.update({
    content: t('raidCompletionWorkflow.whichRaidDidYouComplete'),
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
    content: t('raidCompletionWorkflow.haveYouCompletedAllCharacters'),
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
        content: t('raidCompletionWorkflow.youHaveNoCharactersRegistered', [regCommandMention]),
        components: [],
      });
      sessions.delete(session.userId);
      return;
    }

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`done_char_select_${session.userId}`)
        .setPlaceholder(t('raidCompletionWorkflow.pleaseSelectCompletedCharacters'))
        .setMinValues(1)
        .setMaxValues(Math.min(characters.length, 25))
        .addOptions(
          characters.map((char) => ({
            label: char.characterName,
            value: char.id,
            description: t('raidCompletionWorkflow.selectedCharacters', [char.characterName]),
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
      content: t('raidCompletionWorkflow.selectCharacterAndConfirm'),
      components: [selectRow, buttonRow],
    });
  } catch (error) {
    console.error('Error fetching characters:', error);
    await interaction.update({
      content: t('general.errorOccurred'),
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
        .setPlaceholder(t('raidCompletionWorkflow.pleaseSelectCompletedCharacters'))
        .setMinValues(1)
        .setMaxValues(Math.min(allCharacters.length, 25))
        .addOptions(
          allCharacters.map((char) => ({
            label: char.characterName,
            value: char.id,
            description: t('raidCompletionWorkflow.selectedCharacters', [char.characterName]),
          }))
        )
    );

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`done_chars_confirm_${session.userId}`)
        .setLabel(t('general.confirm'))
        .setStyle(ButtonStyle.Success)
        .setDisabled(false)
    );

    await interaction.update({
      content: [t('raidCompletionWorkflow.selectedCharacters', [characterNames]), t('raidCompletionWorkflow.clickConfirmToSaveOrChangeSelection')].join('\n'),
      components: [selectRow, buttonRow],
    });
  } catch (error) {
    console.error('Error showing confirmation:', error);
    await interaction.update({
      content: t('general.errorOccurred'),
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
  session: SessionData,
  characterIds: string[] | null,
  raidDate: Date,
  interaction: Interaction
): Promise<number> {
  const discordUserId = session.userId;
  const completedBothRaids = session.completedBothRaids;
  const selectedRaid = session.selectedRaid;

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

  const transaction = []

  if (session.evidenceMessageId && interaction.channel) {
    try {
      // Fetch the message to get its URL
      const evidenceMessage = await interaction.channel.messages.fetch(session.evidenceMessageId);
      transaction.push(prisma.raidCompletionEvidence.create({
        data: {
          discordUserId,
          raidDate,
          messageUrl: evidenceMessage.url,
        },
      }));
    } catch (error) {
      console.error('Error fetching evidence message:', error);
    }
  }

  transaction.push(prisma.raidCompletion.createMany({
    data: completionRecords,
    skipDuplicates: true,
  }));

  await prisma.$transaction(transaction);

  return completionRecords.length;
}

export async function completeRaidTracking(
  interaction: ButtonInteraction,
  session: SessionData
): Promise<void> {
  try {
    // Use selected date if available, otherwise use raidDate
    const raidDate = session.selectedDate || getServerToday();

    let characterIds: string[] | null = null;

    if (session.completedAllCharacters) {
      // Pass null to fetch all registered characters
      characterIds = null;
    } else {
      if (!session.selectedCharacterIds || session.selectedCharacterIds.length === 0) {
        await interaction.update({
          content: t('raidCompletionWorkflow.noCharacterSelected'),
          components: [],
        });
        sessions.delete(session.userId);
        return;
      }
      characterIds = session.selectedCharacterIds;
    }

    // Create raid completion records
    const recordCount = await createRaidCompletionRecords(
      session,
      characterIds,
      raidDate,
      interaction,
    );

    if (recordCount === 0) {
      await interaction.update({
        content: t('raidCompletionWorkflow.youHaveNoCharactersRegistered', [regCommandMention]),
        components: [],
      });
      sessions.delete(session.userId);
      return;
    }


    if (session.messageId && interaction.channel) {
      const message = await interaction.channel.messages.fetch(session.messageId);

      if (interaction.message.reference?.messageId) {
        await message.delete();
      }

      await (interaction.channel as TextChannel).send({
        content: t('raidCompletionWorkflow.userHasCompletedRaidTracking', [`<@${session.userId}>`]),
      });
    }

    sessions.delete(session.userId);
  } catch (error) {
    console.error('Error completing raid tracking:', error);
    await interaction.update({
      content: t('general.errorOccurred'),
      components: [],
    });

    sessions.delete(session.userId);
  }
}