import { RaidType, RegisterCharacter } from "@/generated/prisma/browser";
import { getCommandMention } from "@/service/command-manager";
import { createCompleteRecord } from "@/service/hc-submission";
import { raids } from "@/utils/raids";
import {
  deleteSession,
  getSession,
  type RaidWorkflowSession,
} from "@/service/session";
import { getUserCharacters } from "@/service/user";
import { getLast7Days, getServerToday } from "@/utils/date";
import { fetchT } from "@commandkit/i18n";
import { TZDate } from "@date-fns/tz";
import {
  ActionRow,
  TextDisplay,
  Button,
  Modal,
  Label,
  StringSelectMenu,
  StringSelectMenuOption,
  type OnModalKitSubmit,
  Logger,
  type OnButtonKitClick,
  UserSelectMenu,
  type CommandKitButtonBuilderInteractionCollectorDispatch,
} from "commandkit";
import { ButtonStyle, MessageFlags } from "discord.js";

export const SubmissionNotification = async ({
  sessionId,
}: {
  sessionId: string;
}) => {
  const session = (await getSession(sessionId)) as RaidWorkflowSession;
  const isToday = session.isToday;
  const t = fetchT(session.locale);

  return (
    <>
      <TextDisplay content={t("hc-submission:submit-notification")} />
      <TextDisplay content={t("hc-submission:select-content")} />
      {isToday ? (
        <ActionRow>
          <Button
            style={ButtonStyle.Primary}
            onClick={(interaction) => {
              showSubmissionModal({ interaction, sessionId });
            }}
          >
            {t("hc-submission:record-partial-characters")}
          </Button>
          <Button
            style={ButtonStyle.Primary}
            onClick={getSubmitAllCharactersHandler(sessionId)}
          >
            {t("hc-submission:complete-all-characters-hc")}
          </Button>
        </ActionRow>
      ) : (
        <ActionRow>
          <Button
            style={ButtonStyle.Primary}
            options={{
              once: false,
            }}
            onClick={(interaction) => {
              showSubmissionModal({ interaction, sessionId });
            }}
          >
            {t("hc-submission:record-characters-hc")}
          </Button>
        </ActionRow>
      )}
    </>
  );
};

export const SubmissionModal = async ({
  sessionId,
  characters,
}: {
  sessionId: string;
  characters: RegisterCharacter[];
}) => {
  const session = (await getSession(sessionId)) as RaidWorkflowSession;
  const isToday = session.isToday;
  const isAdmin = session.isAdmin;
  const t = fetchT(session.locale);

  return (
    <Modal
      customId="submission-modal"
      title={t("hc-submission:submit-modal:title")}
      onSubmit={getSubmissionModalSubmitHandler(sessionId)}
    >
      {[
        isAdmin ? (
          <Label
            label={t("hc-submission:submit-modal:user:label")}
            description={t("hc-submission:submit-modal:user:description")}
          >
            <UserSelectMenu customId="user" required></UserSelectMenu>
          </Label>
        ) : undefined,
        !isToday ? (
          <Label
            label={t("hc-submission:submit-modal:date:label")}
            description={t("hc-submission:submit-modal:date:description")}
          >
            <StringSelectMenu customId="date">
              {getLast7Days().map((date, index) => (
                <StringSelectMenuOption
                  default={index === 0}
                  label={date.label}
                  value={date.value}
                />
              ))}
            </StringSelectMenu>
          </Label>
        ) : undefined,
        <Label
          label={t("hc-submission:submit-modal:raids:label")}
          description={t("hc-submission:submit-modal:raids:description")}
        >
          <StringSelectMenu
            customId="raids"
            minValues={1}
            maxValues={raids.length}
          >
            {raids.map((raid) => (
              <StringSelectMenuOption
                default={
                  raid.id === RaidType.Kirollas || raid.id === RaidType.Carno
                }
                label={t(raid.simpleName)}
                description={t(raid.originalName)}
                value={raid.id}
              />
            ))}
          </StringSelectMenu>
        </Label>,
        !isAdmin ? (
          <Label
            label={t("hc-submission:submit-modal:characters:label")}
            description={t("hc-submission:submit-modal:characters:description")}
          >
            <StringSelectMenu
              customId="characters"
              minValues={1}
              maxValues={characters.length}
            >
              {characters.map((character) => (
                <StringSelectMenuOption
                  default
                  label={character.characterName}
                  value={character.id}
                />
              ))}
            </StringSelectMenu>
          </Label>
        ) : undefined,
      ].filter((component) => component !== undefined)}
    </Modal>
  );
};

export async function showSubmissionModal({
  interaction,
  sessionId,
}: {
  interaction: Parameters<CommandKitButtonBuilderInteractionCollectorDispatch>[0];
  sessionId: string;
}) {
  const session = (await getSession(sessionId)) as RaidWorkflowSession;
  const t = fetchT(session.locale);

  if (session.actionUserId !== interaction.user.id) {
    await interaction.reply({
      content: t("general:you-cannot-use-this-button"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const characters = await getUserCharacters(interaction.user.id);
  if (!session.isAdmin && characters.length === 0) {
    await interaction.reply({
      content: t("general:no-characters-registered", {
        reg: await getCommandMention("reg"),
      }),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = await SubmissionModal({ characters, sessionId });
  await interaction.showModal(modal);
}

function getSubmitAllCharactersHandler(sessionId: string) {
  const handleSubmitAllCharacters: OnButtonKitClick = async (
    interaction,
    context,
  ) => {
    const session = (await getSession(sessionId)) as RaidWorkflowSession;
    const t = fetchT(session.locale);

    if (session.actionUserId !== interaction.user.id) {
      await interaction.reply({
        content: t("general:you-cannot-use-this-button"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const characters = await getUserCharacters(interaction.user.id);

      if (characters.length === 0) {
        await interaction.reply({
          content: t("general:no-characters-registered", {
            reg: await getCommandMention("reg"),
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await createCompleteRecord({
        userId: interaction.user.id,
        raidDate: getServerToday(),
        raidTypes: [RaidType.Kirollas, RaidType.Carno] as const,
        characterIds: characters.map((character) => character.id),
        evidenceMessageUrl: session.evidenceMessageUrl,
      });

      if (session.interactionMessageId) {
        await interaction.channel?.messages
          .fetch(session.interactionMessageId)
          .then((message) => message.delete());
      }

      if (!interaction.channel?.isSendable()) return;
      await interaction.channel.send({
        content: t("hc-submission:complete-record-created", {
          user: `<@${interaction.user.id}>`,
        }),
      });
    } catch (error) {
      Logger.error(`Error creating complete record: ${error}`);
      console.error(error);

      await interaction.reply({
        content: t("general:error-occurred"),
      });
    } finally {
      context.dispose();
    }
  };

  return handleSubmitAllCharacters;
}

function getSubmissionModalSubmitHandler(sessionId: string) {
  const handleSubmissionModalSubmit: OnModalKitSubmit = async (
    interaction,
    context,
  ) => {
    const session = (await getSession(sessionId)) as RaidWorkflowSession;
    const t = fetchT(session.locale);
    const channel = interaction.channel;

    if (!channel || !channel.isSendable()) return;

    if (session.actionUserId !== interaction.user.id) {
      await interaction.reply({
        content: t("general:you-cannot-use-this-button"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const date = interaction.fields.fields.has("date")
        ? new TZDate(
            interaction.fields.getStringSelectValues("date").at(0) ??
              getServerToday().toISOString(),
            "UTC",
          )
        : getServerToday();

      const raids = interaction.fields.getStringSelectValues("raids");

      const user = interaction.fields.fields.has("user")
        ? (interaction.fields.getSelectedUsers("user", true).at(0)?.id ??
          session.targetUserId)
        : session.targetUserId;

      const characters = interaction.fields.fields.has("characters")
        ? interaction.fields.getStringSelectValues("characters")
        : (await getUserCharacters(user)).map((character) => character.id);

      if (characters.length === 0) {
        await interaction.reply({
          content: t("admin:user-have-no-characters-registered", {
            user: `<@${user}>`,
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await createCompleteRecord({
        userId: user,
        raidDate: date,
        raidTypes: raids.map((raid) => raid as RaidType),
        characterIds: characters,
        evidenceMessageUrl: session.evidenceMessageUrl,
      });

      if (session.interactionMessageId) {
        await interaction.channel?.messages
          .fetch(session.interactionMessageId)
          .then((message) => message.delete());
      }

      await channel.send({
        content: t("hc-submission:complete-record-created", {
          user: `<@${user}>`,
        }),
      });

      await interaction.deferUpdate();

      context.dispose();
      await deleteSession(sessionId);
    } catch (error) {
      Logger.error(`Error creating complete record: ${error}`);
      console.error(error);

      await channel.send({
        content: t("general:error-occurred"),
      });
    }
  };

  return handleSubmissionModalSubmit;
}
