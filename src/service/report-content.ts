import {
  DailyReportContent,
  RangedReportContent,
} from "@/components/report-content";
import { getSession, type ReportGenerationSession } from "./session";
import { generateDailyReport, generateRangedReport } from "./report";
import client from "@/app";

export async function getDailyReportContent(sessionId: string) {
  const session = (await getSession(sessionId)) as ReportGenerationSession;

  if (!session) {
    throw new Error("Session not found");
  }

  if (!session.reportStartDate || !session.reportRaidType) {
    throw new Error("Report start date or raid type not found");
  }

  const reportResult = await generateDailyReport(
    session.reportStartDate,
    session.reportRaidType,
  );

  const user = await client.users.fetch(session.actionUserId);

  return DailyReportContent({
    userName: user.username,
    raidDate: session.reportStartDate,
    raidType: session.reportRaidType,
    reportResult: reportResult,
    locale: session.locale,
  });
}

export async function getRangedReportContent(sessionId: string) {
  const session = (await getSession(sessionId)) as ReportGenerationSession;
  if (!session) {
    throw new Error("Session not found");
  }

  if (
    !session.reportStartDate ||
    !session.reportEndDate ||
    !session.reportRaidType
  ) {
    throw new Error("Report start date, end date or raid type not found");
  }

  const reportResult = await generateRangedReport(
    session.reportStartDate,
    session.reportEndDate,
    session.reportRaidType,
  );

  const user = await client.users.fetch(session.actionUserId);

  return RangedReportContent({
    userName: user.username,
    raidStartDate: session.reportStartDate,
    raidEndDate: session.reportEndDate,
    raidType: session.reportRaidType,
    reportResult: reportResult,
    locale: session.locale,
  });
}
