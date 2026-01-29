import type { RaidType } from "@/generated/prisma/enums";
import { getRaidCompletionCountReport, getRaidCompletionReport } from "@/generated/prisma/sql";
import { prisma } from "@/service/db";
import { getServerToday } from "@/utils/date";
import { endOfWeek, startOfWeek, subDays, subWeeks } from "date-fns";

export async function generateDailyReport(raidDate: string, raidType: RaidType) {
    const result = await prisma.$queryRawTyped(
        getRaidCompletionReport(
            raidDate,
            raidType
        )
    );

    return result;
}

export async function generateRangedReport(raidStartDate: string, raidEndDate: string, raidType: RaidType) {
    const result = await prisma.$queryRawTyped(
        getRaidCompletionCountReport(
            raidStartDate,
            raidEndDate,
            raidType
        )
    );

    return result;
}

const quickReportTypeMapping = {
    today: 'daily',
    yesterday: 'daily',
    'last-week': 'weekly',
    'this-week': 'weekly'
} as const;

export type QuickReportType = 'today' | 'yesterday' | 'last-week' | 'this-week';

export function getQuickReportTypeMapping(type: QuickReportType) {
    return quickReportTypeMapping[type];
}

export function getQuickReportDateOrRange(type: 'today' | 'yesterday'): Date;
export function getQuickReportDateOrRange(type: 'last-week' | 'this-week'): [Date, Date];
export function getQuickReportDateOrRange(type: QuickReportType): Date | [Date, Date] {
    const today = getServerToday();

    if (type === 'today') return today;
    if (type === 'yesterday') return subDays(today, 1);

    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(thisWeekStart, { weekStartsOn: 1 });

    if (type === 'this-week') return [thisWeekStart, thisWeekEnd];

    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

    if (type === 'last-week') return [lastWeekStart, lastWeekEnd];

    // Exhaustiveness guard (should be unreachable).
    throw new Error(`Unhandled quick report type: ${type satisfies never}`);
}
