import { addDays, format } from "date-fns";
import { getServerToday } from "../utils/date";
import type { Locale } from "discord.js";
import { prisma } from "@/service/db";
import { fetchT } from "@commandkit/i18n";

export async function buildDailyNotificationMessage(
  locale: Locale,
): Promise<string> {
  const t = fetchT(locale);

  const today = format(new Date(), "yyyy-MM-dd");

  const utcYesterday = format(addDays(getServerToday(), -1), "yyyy-MM-dd");

  // Count unique Discord users who have raid completions yesterday
  const userCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT rc."registerDiscordUserId") as count
        FROM "RaidCompletion" r
        INNER JOIN "RegisterCharacter" rc ON r."characterId" = rc.id
        WHERE r."raidDate" = ${new Date(utcYesterday)}::date
    `;

  // Count unique characters who have raid completions yesterday
  const characterCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT r."characterId") as count
        FROM "RaidCompletion" r
        WHERE r."raidDate" = ${new Date(utcYesterday)}::date
    `;

  const userCount = Number(userCountResult[0].count);
  const characterCount = Number(characterCountResult[0].count);

  const dailyReset = t("daily-reset:daily-reset", {
    userCount,
    characterCount,
  });
  const todayIs = t("daily-reset:today-is", { today });

  return `${dailyReset}\n${todayIs}`;
}
