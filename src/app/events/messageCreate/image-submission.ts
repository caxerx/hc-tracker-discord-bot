import { DetectedMessage } from "@/components/detection-submission";
import { SubmissionNotification } from "@/components/raid-record-submission";
import { ChannelType } from "@/generated/prisma/enums";
import { detectCharactersAndDate } from "@/service/ai-service";
import { getChannelLanguage, getChannelTypes } from "@/service/channel-setting";
import { getCharactersOwners } from "@/service/character-service";
import { getDiscordLocale } from "@/utils/language";
import {
  createOrUpdateSession,
  generateSessionId,
  type DetectionWorkflowSession,
  type RaidWorkflowSession,
} from "@/service/session";
import { getUserCharacters } from "@/service/user";
import { getServerToday } from "@/utils/date";
import { createTask } from "@commandkit/tasks";
import { Logger, type EventHandler } from "commandkit";
import { MessageFlags, type Message, type TextChannel } from "discord.js";

const handler: EventHandler<"messageCreate"> = async (message) => {
  if (message.author.bot) return;

  if (
    !message.attachments.some((attachment) =>
      attachment.contentType?.startsWith("image/")
    )
  )
    return;

  const channelTypes = await getChannelTypes(message.channelId);
  if (
    !channelTypes.includes(ChannelType.TodaySubmission) &&
    !channelTypes.includes(ChannelType.OtherDateSubmission)
  )
    return;
  const isToday = channelTypes.includes(ChannelType.TodaySubmission);

  if (isToday) {
    try {
      await handleDetection(message);
    } catch (error) {
      Logger.error(`Failed to handle detection: ${error}`);
      console.error(error);
    }
  }

  const channelLanguage = await getChannelLanguage(message.channelId);
  const discordLocale = getDiscordLocale(channelLanguage);

  const sessionId = generateSessionId();
  const session: RaidWorkflowSession = {
    sessionId,
    actionUserId: message.author.id,
    targetUserId: message.author.id,
    evidenceMessageUrl: message.url,
    sessionType: "raid_workflow",
    isToday,
    locale: discordLocale,
  };

  await createOrUpdateSession(session);

  const notification = await SubmissionNotification({ sessionId });
  const interactionMessage = await message.reply({
    components: notification,
    flags: MessageFlags.IsComponentsV2,
  });

  await createOrUpdateSession({
    ...session,
    interactionMessageId: interactionMessage.id,
  });
};

const handleDetection = async (
  message: Parameters<EventHandler<"messageCreate">>[0]
) => {
  const interactionUserCharacters = await getUserCharacters(message.author.id);

  const detectionResult = await detectCharactersAndDate(
    message.attachments.map((attachment) => attachment.url),
    getServerToday()
  );
  const detectedCharacters = detectionResult.detectedCharacter.filter(
    (character) =>
      !interactionUserCharacters.some((c) => c.characterName === character)
  );

  if (detectedCharacters.length == 0) return;

  const ownerSet = await getCharactersOwners(
    detectedCharacters,
    getServerToday()
  );

  const channelLanguage = await getChannelLanguage(message.channelId);
  const discordLocale = getDiscordLocale(channelLanguage);

  const sessionId = generateSessionId();

  const session: DetectionWorkflowSession = {
    sessionId,
    actionUserId: message.author.id,
    evidenceMessageUrl: message.url,
    sessionType: "detection_workflow",
    detectedCharacters: detectedCharacters,
    detectedOwners: Array.from(ownerSet),
    completedOwners: [],
    locale: discordLocale,
  };

  await createOrUpdateSession(session);

  const detectedMessage = await DetectedMessage({ sessionId });

  if (!message.channel?.isSendable()) {
    return;
  }

  const detectedInteractionMessage = await message.channel.send({
    components: detectedMessage,
    flags: MessageFlags.IsComponentsV2,
  });

  const task = await createTask({
    name: "message-removal",
    data: {
      sessionId,
      messageId: detectedInteractionMessage.id,
      channelId: detectedInteractionMessage.channelId,
    },
    schedule: Date.now() + 5 * 60 * 1000,
  });

  Logger.info(
    `Detection task with id ${task} created for session ${sessionId} with message ${detectedInteractionMessage.id} in channel ${detectedInteractionMessage.channelId}`
  );

  await createOrUpdateSession({
    ...session,
    interactionMessageId: detectedInteractionMessage.id,
  });
};

export default handler;
