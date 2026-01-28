import type { ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { prisma } from '../../db';
import { TZDate } from '@date-fns/tz';
import { startOfDay } from 'date-fns';

type AnyInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction;

export async function handleRegCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const characterName = interaction.options.getString('character_name', true);
  const discordUserId = interaction.user.id;

  try {
    // Check if the user has already registered this character name (active registration)
    const existingCharacter = await prisma.registerCharacter.findFirst({
      where: {
        registerDiscordUserId: discordUserId,
        characterName: characterName,
        unregisterDate: {
          gte: new Date(), // Check if unregisterDate is in the future (still active)
        },
      },
    });

    if (existingCharacter) {
      await interaction.reply({
        content: `角色「${characterName}」已經註冊過了.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // check if any character that is unregistered today
    const todayUnregisteredCharacters = await prisma.registerCharacter.findFirst({
      where: {
        registerDiscordUserId: discordUserId,
        characterName: characterName,
        unregisterDate: new Date(),
      },
    });

    if (todayUnregisteredCharacters) {
      // undo the unregistration date
      await prisma.registerCharacter.update({
        where: {
          id: todayUnregisteredCharacters.id,
        },
        data: {
          registerDate: startOfDay(new TZDate(new Date(), process.env.TZ)),
        },
      });
    } else {
      // Register the character (users can have multiple characters)
      await prisma.registerCharacter.create({
        data: {
          characterName: characterName,
          registerDiscordUserId: discordUserId,
        },
      });
    }

    await interaction.reply({
      content: `角色「${characterName}」已經註冊成功.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('Error registering character:', error);
    await interaction.reply({
      content: '發生錯誤.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// Interaction handler registry
export function handleRegInteraction(
  interaction: AnyInteraction
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    return handleRegCommand(interaction);
  }
  return Promise.resolve();
}

// Matcher function to determine if this handler should process the interaction
export function matchesRegInteraction(
  interaction: AnyInteraction
): boolean {
  return interaction.isChatInputCommand() && interaction.commandName === 'reg';
}
