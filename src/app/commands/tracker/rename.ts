import { getChannelLanguage } from "@/service/channel-setting";
import { prisma } from "@/service/db";
import { getDiscordLocale } from "@/utils/language";
import { fetchT } from "@commandkit/i18n";
import {
  Logger,
  type AutocompleteCommand,
  type ChatInputCommand,
  type CommandData,
} from "commandkit";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "rename",
  description: "Rename your character",
  options: [
    {
      name: "old_character_name",
      description: "The old name of your character",
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: true,
    },
    {
      name: "new_character_name",
      description: "The new name of your character",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
  try {
    const input = interaction.options.getString("old_character_name", false);

    const characters = await prisma.registerCharacter.findMany({
      select: {
        characterName: true,
      },
      where: {
        registerDiscordUserId: interaction.user.id,
        unregisterDate: {
          gte: new Date(),
        },
        characterName: input
          ? {
              contains: input,
              mode: "insensitive",
            }
          : undefined,
      },
    });

    interaction.respond(
      characters.map((character) => ({
        name: character.characterName,
        value: character.characterName,
      })),
    );
  } catch (error) {
    Logger.error(`Autocomplete error: ${error}`);
    console.error(error);
  }
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);
  const t = fetchT(locale);

  const oldCharacterName = ctx.interaction.options.getString(
    "old_character_name",
    true,
  );
  const newCharacterName = ctx.interaction.options.getString(
    "new_character_name",
    true,
  );

  const discordUserId = ctx.interaction.user.id;

  const existingCharacter = await prisma.registerCharacter.findFirst({
    where: {
      registerDiscordUserId: discordUserId,
      characterName: oldCharacterName,
      unregisterDate: {
        gte: new Date(),
      },
    },
  });

  if (!existingCharacter) {
    await ctx.interaction.reply({
      content: t("rename:old-character-not-found", { oldCharacterName }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const newCharacterExists = await prisma.registerCharacter.findFirst({
    where: {
      registerDiscordUserId: discordUserId,
      characterName: newCharacterName,
      unregisterDate: {
        gte: new Date(),
      },
    },
  });

  if (newCharacterExists) {
    await ctx.interaction.reply({
      content: t("rename:new-character-already-exists", { newCharacterName }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await prisma.registerCharacter.update({
    where: {
      id: existingCharacter.id,
    },
    data: {
      characterName: newCharacterName,
    },
  });

  await ctx.interaction.reply({
    content: t("rename:character-renamed", {
      oldCharacterName,
      newCharacterName,
    }),
    flags: MessageFlags.Ephemeral,
  });
};
