import { ReportGenerationActionMessage } from "@/components/report";
import { getChannelLanguage } from "@/service/channel-setting";
import { getDiscordLocale } from "@/service/language";
import {
  createOrUpdateSession,
  generateSessionId,
  type ReportGenerationSession,
} from "@/service/session";
import type { ChatInputCommand, CommandData } from "commandkit";
import { MessageFlags } from "discord.js";

export const command: CommandData = {
  name: "report",
  description: "Generate a raid completion report",
};

export const chatInput: ChatInputCommand = async (ctx) => {
  const channelSetting = await getChannelLanguage(ctx.interaction.channelId);
  const locale = getDiscordLocale(channelSetting);

  const sessionId = generateSessionId();
  const session: ReportGenerationSession = {
    sessionId,
    actionUserId: ctx.interaction.user.id,
    sessionType: "report_generation",
    locale: locale,
  };
  await createOrUpdateSession(session);

  const interactionMessage = await ctx.interaction.reply({
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    components: await ReportGenerationActionMessage({
      sessionId,
    }),
  });

  await createOrUpdateSession({
    ...session,
    interactionMessageId: interactionMessage.id,
  } as ReportGenerationSession);
};
