import {
  Modal,
  Label,
  ShortInput,
  ParagraphInput,
  type OnModalKitSubmit,
} from "commandkit";
import { fetchT } from "@commandkit/i18n";
import {
  createRaidEvent,
  sendRaidEventNotification,
} from "@/service/raid-event";
import { getChannelLanguage } from "@/service/channel-setting";
import { getDiscordLocale } from "@/utils/language";
import { parse, isValid, isFuture, addDays, format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { Locale, MessageFlags } from "discord.js";
import { Logger } from "commandkit";
import { getServerToday } from "@/utils/date";

export const RaidCreateModal = async ({ locale }: { locale: string }) => {
  const t = fetchT(locale);

  const isZh = locale.startsWith("zh");
  const serverTimezone = process.env.TZ || "UTC";
  const timezone = isZh ? "UTC+8" : serverTimezone;
  const timeDescription = `Format: HH:mm (${timezone} time, e.g., 18:00)`;

  // Calculate tomorrow's date as default
  const tomorrow = addDays(getServerToday(), 1);
  const defaultDate = format(tomorrow, "yyyy-MM-dd");

  return (
    <Modal
      title={t("createraid:modal-title")}
      onSubmit={handleRaidCreateSubmit()}
    >
      <Label
        label={t("createraid:modal-name-label")}
        description={t("createraid:modal-name-description")}
      >
        <ShortInput
          customId="event_name"
          required
          placeholder="Weekly Kirollas Run"
        />
      </Label>

      <Label
        label={t("createraid:modal-date-label")}
        description={t("createraid:modal-date-description")}
      >
        <ShortInput
          customId="event_date"
          required
          placeholder="2026-02-10"
          value={defaultDate}
        />
      </Label>

      <Label
        label={t("createraid:modal-time-label")}
        description={timeDescription}
      >
        <ShortInput customId="event_time" required placeholder="18:00" />
      </Label>

      <Label
        label={t("createraid:modal-description-label")}
        description={t("createraid:modal-description-description")}
      >
        <ParagraphInput
          customId="event_description"
          placeholder="Bring your best gear!"
        />
      </Label>
    </Modal>
  );
};

function handleRaidCreateSubmit(): OnModalKitSubmit {
  return async (interaction, ctx) => {
    try {
      // Get channel locale
      const channelSetting = await getChannelLanguage(interaction.channelId!);
      const locale = getDiscordLocale(channelSetting);
      const t = fetchT(locale);

      // Extract field values
      const eventName = interaction.fields.getTextInputValue("event_name");
      const eventDateStr = interaction.fields.getTextInputValue("event_date");
      const eventTimeStr = interaction.fields.getTextInputValue("event_time");
      const eventDescription = interaction.fields.fields.has(
        "event_description"
      )
        ? interaction.fields.getTextInputValue("event_description")
        : undefined;

      // Hardcoded location for Nostale
      const eventLocation = "Nostale";

      // Parse date
      const parsedDate = parse(eventDateStr, "yyyy-MM-dd", new Date());
      if (!isValid(parsedDate)) {
        await interaction.reply({
          content: t("createraid:invalid-date-format"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Parse time
      const parsedTime = parse(eventTimeStr, "HH:mm", new Date());
      if (!isValid(parsedTime)) {
        await interaction.reply({
          content: t("createraid:invalid-time-format"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Determine timezone based on locale
      const isZh = locale === Locale.ChineseTW;
      const timezone = isZh ? "Asia/Taipei" : (process.env.TZ || "UTC");

      // Combine date and time in the user's timezone
      // Format: "YYYY-MM-DD HH:mm" in user's local timezone
      const dateTimeString = `${eventDateStr} ${eventTimeStr}`;
      const eventDateTime = new TZDate(dateTimeString, timezone);

      // Validate the combined datetime is valid
      if (!isValid(eventDateTime)) {
        await interaction.reply({
          content: t("createraid:invalid-date-format"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // TZDate automatically handles conversion to UTC
      // When stored in the database, it will be in UTC
      const eventTimeUTC = eventDateTime;

      // Validate datetime is in the future
      if (!isFuture(eventTimeUTC)) {
        await interaction.reply({
          content: t("createraid:must-be-future"),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Defer reply as this might take time
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Create event
      const { raidEvent, scheduledEvent } = await createRaidEvent({
        guildId: interaction.guildId!,
        organizerUserId: interaction.user.id,
        eventName,
        eventTime: eventTimeUTC,
        eventLocation,
        eventDescription,
      });

      // Send notifications to RaidEvent channels
      await sendRaidEventNotification({
        raidEventId: raidEvent.id,
        eventName,
        eventTime: eventTimeUTC,
        eventLocation,
        eventDescription,
        scheduledEventUrl: scheduledEvent.url!,
      });

      // Confirm success
      await interaction.editReply({
        content: t("createraid:creation-success", { eventName }),
      });

      ctx.dispose();
    } catch (error) {
      Logger.error(`Failed to create raid event: ${error}`);
      console.error(error);

      const channelSetting = await getChannelLanguage(interaction.channelId!);
      const locale = getDiscordLocale(channelSetting);
      const t = fetchT(locale);

      // Check if interaction was already replied to
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: t("createraid:creation-failed"),
        });
      } else {
        await interaction.reply({
          content: t("createraid:creation-failed"),
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  };
}
