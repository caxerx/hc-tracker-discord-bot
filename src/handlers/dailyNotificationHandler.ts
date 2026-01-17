// HC任務本日已重置, 昨天有5個人共25個角色完成任務
// ## 今天是 2025-01-15

import { addDays, format } from "date-fns";
import { prisma } from "../db";
import { getUtcToday } from "../utils/date";
import type { Client, TextChannel } from "discord.js";

export async function buildDailyNotificationMessage(): Promise<string> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const utcYesterday = format(addDays(getUtcToday(), -1), 'yyyy-MM-dd');

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

    return `HC任務已重置, 昨天有${userCount}個人共${characterCount}個角色完成任務
## 今天是 ${today}`;
}

export async function sendDailyNotification(client: Client, channelIds: string[]): Promise<void> {
    const message = await buildDailyNotificationMessage();

    for (const channelId of channelIds) {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            await (channel as TextChannel).send(message);
        }
    }
}