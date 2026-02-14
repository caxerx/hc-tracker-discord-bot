import { getChannelLanguage } from "@/service/channel-setting";
import { prisma } from "@/service/db";
import { getDiscordLocale } from "@/utils/language";
import { getServerToday } from "@/utils/date";
import { fetchT } from "@commandkit/i18n";
import type { ChatInputCommand, CommandData } from "commandkit";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "reg",
  description: "Register a character to your Discord account",
  options: [
    {
      name: "character_name",
      description: "The name of your character",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);
  const t = fetchT(locale);

  const characterName = ctx.interaction.options.getString(
    "character_name",
    true,
  );

  const existingCharacter = await prisma.registerCharacter.findFirst({
    where: {
      registerDiscordUserId: ctx.interaction.user.id,
      characterName: characterName,
      unregisterDate: {
        gte: getServerToday(),
      },
    },
  });

  if (existingCharacter) {
    await ctx.interaction.reply({
      content: t("reg:character-already-registered", { characterName }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await prisma.registerCharacter.create({
    data: {
      characterName: characterName,
      registerDiscordUserId: ctx.interaction.user.id,
      registerDate: getServerToday(),
    },
  });

  await ctx.interaction.reply({
    content: t("reg:character-registered-successfully", { characterName }),
    flags: MessageFlags.Ephemeral,
  });
};
