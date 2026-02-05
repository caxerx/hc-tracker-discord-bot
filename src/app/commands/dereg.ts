import { getChannelLanguage } from "@/service/channel-setting";
import { prisma } from "@/service/db";
import { getDiscordLocale } from "@/service/language";
import { getServerToday } from "@/utils/date";
import { fetchT } from "@commandkit/i18n";
import type {
  AutocompleteCommand,
  ChatInputCommand,
  CommandData,
} from "commandkit";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "dereg",
  description: "Deregister a character from your Discord account",
  options: [
    {
      name: "old_character_name",
      description: "The old name of your character",
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: true,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);
  const t = fetchT(locale);

  const oldCharacterName = ctx.interaction.options.getString(
    "old_character_name",
    true,
  );

  const existingCharacter = await prisma.registerCharacter.findFirst({
    where: {
      registerDiscordUserId: ctx.interaction.user.id,
      characterName: oldCharacterName,
      unregisterDate: {
        gte: getServerToday(),
      },
    },
  });

  if (!existingCharacter) {
    await ctx.interaction.reply({
      content: t("dereg:old-character-not-found", { oldCharacterName }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await prisma.registerCharacter.update({
    where: {
      id: existingCharacter.id,
    },
    data: {
      unregisterDate: getServerToday(),
    },
  });

  await ctx.interaction.reply({
    content: t("dereg:character-deregistered-successfully", {
      oldCharacterName,
    }),
    flags: MessageFlags.Ephemeral,
  });
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
  const characters = await prisma.registerCharacter.findMany({
    where: {
      registerDiscordUserId: interaction.user.id,
      unregisterDate: {
        gte: getServerToday(),
      },
    },
    select: {
      characterName: true,
    },
  });

  interaction.respond(
    characters.map((character) => ({
      name: character.characterName,
      value: character.characterName,
    })),
  );
};
