import { RaidType } from "@/generated/prisma/client";
import { getCharactersByOwner } from "@/service/character-service";
import { createCompleteRecord } from "@/service/hc-submission";
import {
  createOrUpdateSession,
  getSession,
  type DetectionWorkflowSession,
} from "@/service/session";
import { getServerToday } from "@/utils/date";
import { fetchT } from "@commandkit/i18n";
import {
  ActionRow,
  Button,
  Container,
  TextDisplay,
  type OnButtonKitClick,
} from "commandkit";
import {
  ButtonStyle,
  Colors,
  MessageFlags,
  type TextChannel,
} from "discord.js";

export const DetectedMessage = async ({ sessionId }: { sessionId: string }) => {
  const session = (await getSession(sessionId)) as DetectionWorkflowSession;
  const t = fetchT(session.locale);

  return (
    <>
      <TextDisplay
        content={t("detection-submission:other-members-characters-detected")}
      />
      <Container accentColor={Colors.Blue}>
        {session.detectedCharacters.map((character) => (
          <TextDisplay content={character} />
        ))}
      </Container>
      <TextDisplay content={t("detection-submission:detected-member-notice")} />

      <Container accentColor={Colors.Blue}>
        {session.detectedOwners
          .filter((owner) => !session.completedOwners.includes(owner))
          .map((owner) => (
            <TextDisplay content={`<@${owner}>`} />
          ))}
      </Container>
      <ActionRow>
        <Button
          style={ButtonStyle.Primary}
          onClick={createConfirmCompletionHandler(sessionId)}
        >
          {t("detection-submission:confirm-completion")}
        </Button>
      </ActionRow>
    </>
  );
};

export const createConfirmCompletionHandler = (sessionId: string) => {
  const handleConfirmCompletion: OnButtonKitClick = async (
    interaction,
    context,
  ) => {
    const session = (await getSession(sessionId)) as DetectionWorkflowSession;
    const t = fetchT(session.locale);

    if (
      !session.detectedOwners.includes(interaction.user.id) ||
      session.completedOwners.includes(interaction.user.id)
    ) {
      await interaction.reply({
        content: t("general:you-cannot-use-this-button"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    session.completedOwners.push(interaction.user.id);
    await createOrUpdateSession(session);

    if (session.interactionMessageId) {
      const interactionMessage = await interaction.channel?.messages.fetch(
        session.interactionMessageId,
      );

      if (session.detectedOwners.length != session.completedOwners.length) {
        const newDetectedMessage = await DetectedMessage({ sessionId });

        await interactionMessage?.edit({
          components: newDetectedMessage,
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interactionMessage?.delete();
      }
    }

    const characters = await getCharactersByOwner(
      interaction.user.id,
      getServerToday(),
    );
    await createCompleteRecord({
      userId: interaction.user.id,
      raidDate: getServerToday(),
      raidTypes: [RaidType.Kirollas, RaidType.Carno] as const,
      characterIds: characters.map((character) => character.id),
      evidenceMessageUrl: session.evidenceMessageUrl,
    });

    await (interaction.channel as TextChannel).send({
      content: t("hc-submission:complete-record-created", {
        user: `<@${interaction.user.id}>`,
      }),
    });
  };

  return handleConfirmCompletion;
};
