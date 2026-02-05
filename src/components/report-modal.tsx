import type { RaidType } from "@/generated/prisma/enums";
import { raids } from "@/service/raids";
import {
  getDailyReportContent,
  getRangedReportContent,
} from "@/service/report-content";
import {
  createOrUpdateSession,
  getSession,
  type ReportGenerationSession,
} from "@/service/session";
import { getLast6Months, getLast6Weeks, getLast7Days } from "@/utils/date";
import { fetchT } from "@commandkit/i18n";
import {
  Label,
  Modal,
  StringSelectMenu,
  StringSelectMenuOption,
  type OnModalKitSubmit,
} from "commandkit";
import { endOfMonth, endOfWeek, format, parse } from "date-fns";
import { MessageFlags, type TextChannel } from "discord.js";

export const ReportModal = async ({ sessionId }: { sessionId: string }) => {
  const session = (await getSession(sessionId)) as ReportGenerationSession;
  const t = fetchT(session.locale);

  const isDaily = session.reportType === "daily";
  const isWeekly = session.reportType === "weekly";
  const isMonthly = session.reportType === "monthly";

  return (
    <Modal
      title={t("report:generate-report")}
      onSubmit={getReportGenerationHandler(sessionId)}
    >
      {[
        <Label
          label={t("hc-submission:submit-modal:raids:label")}
          description={t("hc-submission:submit-modal:raids:description")}
        >
          <StringSelectMenu customId="raids" required>
            {raids.map((raid, index) => (
              <StringSelectMenuOption
                default={index === 0}
                label={t(raid.simpleName)}
                description={t(raid.originalName)}
                value={raid.id}
              />
            ))}
          </StringSelectMenu>
        </Label>,
        isDaily ? (
          <Label
            label={t("hc-submission:submit-modal:date:label")}
            description={t("hc-submission:submit-modal:date:description")}
          >
            <StringSelectMenu customId="date" required>
              {getLast7Days().map((date, index) => (
                <StringSelectMenuOption
                  default={index === 0}
                  label={
                    index === 0
                      ? t("report:date:today-with-date", { date: date.label })
                      : index === 1
                        ? t("report:date:yesterday-with-date", {
                            date: date.label,
                          })
                        : date.label
                  }
                  value={date.value}
                />
              ))}
            </StringSelectMenu>
          </Label>
        ) : undefined,
        isWeekly ? (
          <Label
            label={t("hc-submission:submit-modal:date:label")}
            description={t("hc-submission:submit-modal:date:description")}
          >
            <StringSelectMenu customId="date" required>
              {getLast6Weeks().map((date, index) => (
                <StringSelectMenuOption
                  default={index === 0}
                  label={t("report:date:week-range", {
                    startDate: date.startDate,
                    endDate: date.endDate,
                  })}
                  value={date.value}
                />
              ))}
            </StringSelectMenu>
          </Label>
        ) : undefined,
        isMonthly ? (
          <Label
            label={t("hc-submission:submit-modal:date:label")}
            description={t("hc-submission:submit-modal:date:description")}
          >
            <StringSelectMenu customId="date" required>
              {getLast6Months().map((date, index) => (
                <StringSelectMenuOption
                  default={index === 0}
                  label={date.label}
                  value={date.value}
                />
              ))}
            </StringSelectMenu>
          </Label>
        ) : undefined,
      ].filter((component) => component !== undefined)}
    </Modal>
  );
};

function getReportGenerationHandler(sessionId: string) {
  const handleReportGeneration: OnModalKitSubmit = async (interaction, ctx) => {
    const session = (await getSession(sessionId)) as ReportGenerationSession;
    const channel = interaction.channel;
    if (!channel || !channel.isSendable()) return;

    const raids = interaction.fields.getStringSelectValues(
      "raids",
    )[0] as RaidType;
    const date = interaction.fields.getStringSelectValues("date")[0]!;
    const startDate = parse(date, "yyyy-MM-dd", new Date());

    session.reportRaidType = raids;
    if (session.reportType === "daily") {
      session.reportStartDate = format(startDate, "yyyy-MM-dd");
    } else if (session.reportType === "weekly") {
      session.reportStartDate = format(startDate, "yyyy-MM-dd");
      session.reportEndDate = format(
        endOfWeek(startDate, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
    } else if (session.reportType === "monthly") {
      session.reportStartDate = format(startDate, "yyyy-MM-dd");
      session.reportEndDate = format(endOfMonth(startDate), "yyyy-MM-dd");
    }
    await createOrUpdateSession(session);

    if (session.reportType === "daily") {
      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: await getDailyReportContent(sessionId),
      });
    } else {
      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: await getRangedReportContent(sessionId),
      });
    }

    interaction.deferUpdate();
    ctx.dispose();
  };

  return handleReportGeneration;
}
