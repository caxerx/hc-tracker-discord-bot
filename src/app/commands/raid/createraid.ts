import { RaidCreateModal } from "@/components/raid-helper/raid-create-modal";
import { getChannelLanguage } from "@/service/channel-setting";
import { getDiscordLocale } from "@/utils/language";
import type { ChatInputCommand, CommandData } from "commandkit";

export const command: CommandData = {
  name: "createraid",
  description: "Create a new raid event",
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);

  // Show modal directly (no permission check needed)
  const modal = await RaidCreateModal({ locale });
  await ctx.interaction.showModal(modal);
};
