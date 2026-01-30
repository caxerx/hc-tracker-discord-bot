import type { RaidType } from "@/generated/prisma/enums";
import { Locale } from "discord.js";
import { fetchT } from "@commandkit/i18n";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { tzName } from "@date-fns/tz";
import { Separator, TextDisplay } from "commandkit";
import { Container } from "commandkit";
import { Colors } from "discord.js";
import type {
  getRaidCompletionCountReport,
  getRaidCompletionReport,
} from "@/generated/prisma/sql";

export const DailyReportContent = ({
  locale,
  userName,
  raidDate,
  raidType,
  reportResult,
}: {
  locale: Locale;
  userName: string;
  raidDate: string;
  raidType: RaidType;
  reportResult: getRaidCompletionReport.Result[];
}) => {
  const t = fetchT(locale);
  const timezone =
    locale === Locale.EnglishUS ? "Europe/Berlin" : "Asia/Taipei";
  const currentTime = new TZDate(new Date(), timezone);
  const currentTimeString = format(currentTime, "yyyy-MM-dd HH:mm:ss");
  const timezoneName = tzName(timezone, currentTime, "short");

  const completedCharacters = reportResult
    .filter((result) => result.isCompleted)
    .map((result) => result.characterName)
    .map((character) => `- \`${character}\``);
  const notCompletedCharacters = reportResult
    .filter((result) => !result.isCompleted)
    .map((result) => result.characterName)
    .map((character) => `- \`${character}\``);

  return (
    <>
      <TextDisplay
        content={t("report:daily-report-title", { raidType, raidDate })}
      />
      <Container accentColor={Colors.Blue}>
        <TextDisplay>
          **{t("report:completed-characters")} ({completedCharacters.length}/
          {reportResult.length})**
        </TextDisplay>
        <Separator />
        <TextDisplay
          content={
            completedCharacters.join("\n") ||
            t("report:no-completed-characters")
          }
        />
      </Container>

      <Container accentColor={Colors.Red}>
        <TextDisplay>
          **{t("report:not-completed-characters")} (
          {notCompletedCharacters.length}/{reportResult.length})**
        </TextDisplay>
        <Separator />
        <TextDisplay
          content={
            notCompletedCharacters.join("\n") ||
            t("report:all-characters-completed")
          }
        />
      </Container>
      <TextDisplay>
        {t("report:generated-by", {
          userName,
          currentTime: currentTimeString,
          timezoneName,
        })}
      </TextDisplay>
    </>
  );
};

export const RangedReportContent = ({
  locale,
  userName,
  raidStartDate,
  raidEndDate,
  raidType,
  reportResult,
}: {
  locale: Locale;
  userName: string;
  raidStartDate: string;
  raidEndDate: string;
  raidType: RaidType;
  reportResult: getRaidCompletionCountReport.Result[];
}) => {
  const t = fetchT(locale);
  const timezone =
    locale === Locale.EnglishUS ? "Europe/Berlin" : "Asia/Taipei";
  const currentTime = new TZDate(new Date(), timezone);
  const currentTimeString = format(currentTime, "yyyy-MM-dd HH:mm:ss");
  const timezoneName = tzName(timezone, currentTime, "short");

  const totalCompletionCount = reportResult.reduce(
    (acc, result) => acc + (result.completionCount ?? BigInt(0)),
    BigInt(0),
  );

  return (
    <>
      <TextDisplay
        content={t("report:range-report-title", {
          raidType,
          raidStartDate,
          raidEndDate,
        })}
      />
      <Container accentColor={Colors.Green}>
        <TextDisplay>
          **
          {t("report:range-completed-characters", {
            completionCount: totalCompletionCount,
          })}
          **
        </TextDisplay>
        <Separator />
        <TextDisplay
          content={
            reportResult
              .map(
                (result) =>
                  `\`${result.completionCount}\` - \`${result.characterName}\``,
              )
              .join("\n") || t("report:no-completed-characters")
          }
        />
      </Container>
      <TextDisplay>
        {t("report:generated-by", {
          userName,
          currentTime: currentTimeString,
          timezoneName,
        })}
      </TextDisplay>
    </>
  );
};
