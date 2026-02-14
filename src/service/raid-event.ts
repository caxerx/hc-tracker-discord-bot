import { prisma } from "./db";
import { getAllChannelWithType, getChannelLanguage } from "./channel-setting";
import { ChannelType } from "@/generated/prisma/enums";
import client from "@/app";
import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  MessageFlags,
  type TextChannel,
} from "discord.js";
import { Logger } from "commandkit";
import { getDiscordLocale } from "@/utils/language";
import { RaidEventNotification } from "@/components/raid-helper/raid-join-button";

export async function createRaidEvent({
  guildId,
  organizerUserId,
  eventName,
  eventTime,
  eventLocation,
  eventDescription,
}: {
  guildId: string;
  organizerUserId: string;
  eventName: string;
  eventTime: Date;
  eventLocation: string;
  eventDescription?: string;
}) {
  // Create Discord scheduled event
  const guild = await client.guilds.fetch(guildId);

  // External events require an end time - set to 15 minutes after start
  const eventEndTime = new Date(eventTime.getTime() + 15 * 60 * 1000);

  const scheduledEvent = await guild.scheduledEvents.create({
    name: eventName,
    scheduledStartTime: eventTime,
    scheduledEndTime: eventEndTime,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType: GuildScheduledEventEntityType.External,
    entityMetadata: {
      location: eventLocation,
    },
    description: eventDescription || undefined,
  });

  // Store Discord event in database first
  const discordEvent = await prisma.discordEvent.create({
    data: {
      guildId,
      eventId: scheduledEvent.id,
    },
  });

  // Store raid event with reference to Discord event
  const raidEvent = await prisma.raidEvent.create({
    data: {
      eventName,
      eventTime,
      eventLocation,
      eventDescription,
      eventOrganizerDiscordUserId: organizerUserId,
      eventId: discordEvent.eventId,
    },
  });

  return { raidEvent, scheduledEvent };
}

export async function sendRaidEventNotification({
  raidEventId,
  eventName,
  eventTime,
  eventLocation,
  eventDescription,
  scheduledEventUrl,
}: {
  raidEventId: string;
  eventName: string;
  eventTime: Date;
  eventLocation: string;
  eventDescription?: string;
  scheduledEventUrl: string;
}) {
  const channelSettings = await getAllChannelWithType(ChannelType.RaidEvent);

  if (channelSettings.length === 0) {
    Logger.warn(
      "No RaidEvent channels configured. Event created but no notifications sent."
    );
    return;
  }

  const channels = (
    await Promise.allSettled(
      channelSettings.map((setting) => client.channels.fetch(setting.channelId))
    )
  )
    .filter(
      (result): result is PromiseFulfilledResult<TextChannel> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value)
    .filter(
      (channel): channel is TextChannel =>
        !!channel && channel.isTextBased() && "send" in channel
    );

  const messageUrls: string[] = [];

  for (const channel of channels) {
    try {
      // Get channel locale for proper formatting
      const channelSetting = await getChannelLanguage(channel.id);
      const locale = getDiscordLocale(channelSetting);

      // Get initial participant count
      const participantCount = await prisma.raidEventParticipant.count({
        where: { raidEventId },
      });

      // Send message with button using Components V2
      const message = await channel.send({
        components: RaidEventNotification({
          raidEventId,
          locale,
          eventName,
          eventTime,
          eventLocation,
          eventDescription,
          scheduledEventUrl,
          participantCount,
          participantNames: [],
        }),
        flags: MessageFlags.IsComponentsV2,
      });

      // Capture message URL
      messageUrls.push(message.url);
    } catch (error) {
      Logger.error(
        `Failed to send raid event notification to channel ${channel.id}: ${error}`
      );
    }
  }

  // Update RaidEvent with message URLs
  if (messageUrls.length > 0) {
    await prisma.raidEvent.update({
      where: { id: raidEventId },
      data: { eventMessages: messageUrls },
    });
  }
}
