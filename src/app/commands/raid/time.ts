import { getTime } from "@/service/ai-service";
import type { ChatInputCommand, CommandData } from "commandkit";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "time",
  description: "Get the time of a relative time text in UTC+8",
  options: [
    {
      name: "time",
      description: "The relative time text, e.g. tomorrow morning 7am, next week Tuesday 8pm",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const timeText = ctx.interaction.options.getString("time") ?? "";

  await ctx.interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const time = await getTime(timeText);
  await ctx.interaction.editReply({
    content: `\`<t:${Math.floor(time.getTime() / 1000)}:f>\``,
  });
};
