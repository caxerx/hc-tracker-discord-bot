import { getChannelLanguage } from "@/service/channel-setting";
import { getDiscordLocale } from "@/utils/language";
import { getLoDScheduleString } from "@/utils/lod";
import type { ChatInputCommand, CommandData } from "commandkit";
import { MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "lod",
  description: "Show the next 24 hours of LoD events",
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);

  const scheduleString = getLoDScheduleString(locale);

  await ctx.interaction.reply({
    content: scheduleString,
    flags: MessageFlags.Ephemeral,
  });
};
