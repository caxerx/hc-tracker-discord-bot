import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { prisma } from '../../db';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

export async function handleRenameCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const oldCharacterName = interaction.options.getString('old_character_name', true);
  const newCharacterName = interaction.options.getString('new_character_name', true);
  const discordUserId = interaction.user.id;

  try {
    // Check if the old character exists and is currently active (owned by this user)
    const existingCharacter = await prisma.registerCharacter.findFirst({
      where: {
        registerDiscordUserId: discordUserId,
        characterName: oldCharacterName,
        unregisterDate: {
          gte: new Date(), // Check if unregisterDate is in the future (still active)
        },
      },
    });

    if (!existingCharacter) {
      await interaction.reply({
        content: `找不到角色 "${oldCharacterName}" 或該角色不屬於你.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if the new character name is already registered by this user
    const newCharacterExists = await prisma.registerCharacter.findFirst({
      where: {
        registerDiscordUserId: discordUserId,
        characterName: newCharacterName,
        unregisterDate: {
          gte: new Date(), // Check if unregisterDate is in the future (still active)
        },
      },
    });

    if (newCharacterExists) {
      await interaction.reply({
        content: `角色 "${newCharacterName}" 已經存在. 請選擇不同的名稱.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Update the character name
    await prisma.registerCharacter.update({
      where: {
        id: existingCharacter.id,
      },
      data: {
        characterName: newCharacterName,
      },
    });

    // Send public notification
    await interaction.reply({
      content: `<@${discordUserId}> 已將角色 "${oldCharacterName}" 重新命名為 "${newCharacterName}".`,
    });
  } catch (error) {
    console.error('Error renaming character:', error);
    await interaction.reply({
      content: '發生錯誤: 重新命名時發生錯誤. 請稍後再試.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Interaction handler registry
export function handleRenameInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleRenameCommand(interaction);
  }
  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesRenameInteraction(
  interaction: AnyInteraction
): boolean {
  return interaction.isChatInputCommand() && interaction.commandName === 'rename';
}
