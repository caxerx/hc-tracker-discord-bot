import {
  Button,
  ActionRow,
  TextDisplay,
  type OnButtonKitClick,
} from "commandkit";
import { ButtonStyle, MessageFlags } from "discord.js";
import { fetchT } from "@commandkit/i18n";
import { prisma } from "@/service/db";
import { Logger } from "commandkit";
import { format } from "date-fns";
import { getChannelLanguage } from "@/service/channel-setting";
import { getDiscordLocale } from "@/utils/language";
import { getCharactersByOwner } from "@/service/character-service";
import client from "@/app";

export const RaidEventNotification = ({
  raidEventId,
  locale,
  eventName,
  eventTime,
  eventLocation,
  eventDescription,
  scheduledEventUrl,
  participantCount,
  participantNames,
}: {
  raidEventId: string;
  locale: string;
  eventName: string;
  eventTime: Date;
  eventLocation: string;
  eventDescription?: string;
  scheduledEventUrl: string;
  participantCount: number;
  participantNames?: string[];
}) => {
  const t = fetchT(locale);

  const participantsList =
    participantNames && participantNames.length > 0
      ? `\n**${t("createraid:joined-characters")}:**\n${participantNames.map((name) => `- ${name}`).join("\n")}`
      : "";

  return (
    <>
      <TextDisplay>
        {`🎉 **${t("createraid:notification-header")}**\n\n**${t(
          "createraid:event-label"
        )}:** ${eventName}\n**${t("createraid:time-label")}:** ${format(
          eventTime,
          "yyyy-MM-dd HH:mm"
        )}\n**${t("createraid:location-label")}:** ${eventLocation}\n**${t(
          "createraid:description-label"
        )}:** ${eventDescription || t("createraid:no-description")}\n**${t(
          "createraid:participants-label"
        )}:** ${participantCount}${participantsList}\n\n[${t(
          "createraid:view-event"
        )}](${scheduledEventUrl})`}
      </TextDisplay>
      <ActionRow>
        <Button
          customId={`join_raid_${raidEventId}`}
          style={ButtonStyle.Success}
          label={t("createraid:join-button-label")}
          onClick={handleJoinRaid(raidEventId)}
          options={{
            once: false,
          }}
        />
      </ActionRow>
    </>
  );
};

async function updateRaidEventMessages(raidEventId: string) {
  // Get the raid event with all details
  const raidEvent = await prisma.raidEvent.findUnique({
    where: { id: raidEventId },
    include: {
      raidEventParticipants: {
        include: {
          character: true,
        },
      },
      discordEvent: true,
    },
  });

  if (!raidEvent || !raidEvent.discordEvent) {
    return;
  }

  const participantNames = raidEvent.raidEventParticipants.map(
    (p) => p.character.characterName
  );
  const participantCount = participantNames.length;

  // Get the Discord scheduled event URL
  const guild = await client.guilds.fetch(raidEvent.discordEvent.guildId);
  const scheduledEvent = await guild.scheduledEvents.fetch(
    raidEvent.discordEvent.eventId
  );

  // Update each message in all channels
  for (const messageUrl of raidEvent.eventMessages) {
    try {
      // Parse message URL: https://discord.com/channels/guildId/channelId/messageId
      const urlParts = messageUrl.split("/");
      const messageId = urlParts[urlParts.length - 1];
      const channelId = urlParts[urlParts.length - 2];

      if (!channelId || !messageId) {
        Logger.error(`Invalid message URL format: ${messageUrl}`);
        continue;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel || !("messages" in channel)) continue;

      const message = await channel.messages.fetch(messageId);

      // Get channel locale
      const channelSetting = await getChannelLanguage(channelId);
      const locale = getDiscordLocale(channelSetting);

      if (!scheduledEvent.url) {
        Logger.error("Scheduled event URL is null");
        continue;
      }

      // Update message with new participant list
      await message.edit({
        components: RaidEventNotification({
          raidEventId: raidEvent.id,
          locale,
          eventName: raidEvent.eventName,
          eventTime: raidEvent.eventTime,
          eventLocation: raidEvent.eventLocation,
          eventDescription: raidEvent.eventDescription ?? undefined,
          scheduledEventUrl: scheduledEvent.url,
          participantCount,
          participantNames,
        }),
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      Logger.error(`Failed to update message ${messageUrl}: ${error}`);
    }
  }
}

function handleJoinRaid(raidEventId: string): OnButtonKitClick {
  return async (interaction, context) => {
    try {
      const userId = interaction.user.id;

      // Get the raid event to retrieve the event date
      const raidEvent = await prisma.raidEvent.findUnique({
        where: { id: raidEventId },
        select: { eventTime: true },
      });

      if (!raidEvent) {
        throw new Error("Raid event not found");
      }

      // Get user's characters that are active on the event date
      const characters = await getCharactersByOwner(userId, raidEvent.eventTime);

      // Get the first registered character (oldest registration date)
      const character = characters.length > 0 ? characters[0] : null;

      if (!character) {
        const channelSetting = await getChannelLanguage(interaction.channelId!);
        const locale = getDiscordLocale(channelSetting);
        const t = fetchT(locale);

        await interaction.reply({
          content: t("createraid:no-registered-character"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if this character is already joined
      const existingParticipant = await prisma.raidEventParticipant.findFirst({
        where: {
          raidEventId,
          characterId: character.id,
        },
      });

      const channelSetting = await getChannelLanguage(interaction.channelId!);
      const locale = getDiscordLocale(channelSetting);
      const t = fetchT(locale);

      if (existingParticipant) {
        await interaction.reply({
          content: t("createraid:already-joined", {
            characterName: character.characterName,
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Create participant record
      await prisma.raidEventParticipant.create({
        data: {
          raidEventId,
          characterId: character.id,
          specialist: "None",
        },
      });

      // Update all event messages with new participant list
      await updateRaidEventMessages(raidEventId);

      await interaction.reply({
        content: t("createraid:join-success", {
          characterName: character.characterName,
        }),
        flags: MessageFlags.Ephemeral,
      });

      context.dispose();
    } catch (error) {
      Logger.error(`Failed to join raid: ${error}`);
      console.error(error);

      const channelSetting = await getChannelLanguage(interaction.channelId!);
      const locale = getDiscordLocale(channelSetting);
      const t = fetchT(locale);

      await interaction.reply({
        content: t("createraid:join-failed"),
        flags: MessageFlags.Ephemeral,
      });
    }
  };
}
