import { addHours, isAfter, isBefore, setHours, setMinutes, startOfDay } from "date-fns";

type TimeConfig = [number, number];

interface LoDEvent {
    startTime: TimeConfig;
    bossTime: TimeConfig;
    endTime: TimeConfig;
    ch: number[];
}

const lodSetting: LoDEvent[] = [
    {
        startTime: [0, 0],
        bossTime: [1, 0],
        endTime: [2, 0],
        ch: [7]
    },
    {
        startTime: [3, 0],
        bossTime: [4, 0],
        endTime: [5, 0],
        ch: [1]
    },
    {
        startTime: [6, 0],
        bossTime: [7, 0],
        endTime: [8, 0],
        ch: [1]
    },
    {
        startTime: [9, 0],
        bossTime: [10, 0],
        endTime: [11, 0],
        ch: [2]
    },
    {
        startTime: [12, 0],
        bossTime: [13, 0],
        endTime: [14, 0],
        ch: [3]
    },
    {
        startTime: [15, 0],
        bossTime: [16, 0],
        endTime: [17, 0],
        ch: [2, 3, 6]
    },
    {
        startTime: [18, 0],
        bossTime: [19, 0],
        endTime: [20, 0],
        ch: [4, 5, 7]
    },
    {
        startTime: [21, 0],
        bossTime: [22, 0],
        endTime: [23, 0],
        ch: [4, 5, 6]
    },
];

/**
 * Get upcoming LoD events in the next 24 hours that are still open for entry.
 * Returns a formatted string with Discord timestamps.
 */
export function getLoDScheduleString(): string {
    const now = new Date();
    const next24Hours = addHours(now, 24);
    const events: string[] = [];

    // Check today's events and tomorrow's events
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
        const baseDate = addHours(startOfDay(now), dayOffset * 24);

        for (const setting of lodSetting) {
            // Create Date objects for this event
            const [startHour, startMin] = setting.startTime;
            const [bossHour, bossMin] = setting.bossTime;

            const startDate = setMinutes(
                setHours(baseDate, startHour),
                startMin
            );
            const bossDate = setMinutes(
                setHours(baseDate, bossHour),
                bossMin
            );

            // Only include if:
            // 1. Boss time hasn't passed yet (still can enter)
            // 2. Event is within next 24 hours
            if (isAfter(bossDate, now) && isBefore(startDate, next24Hours)) {
                const startUnix = Math.floor(startDate.getTime() / 1000);
                const bossUnix = Math.floor(bossDate.getTime() / 1000);
                const chList = setting.ch.join(", ");

                events.push(
                    `Start: <t:${startUnix}:R> Boss: <t:${bossUnix}:R> CH: ${chList}`
                );
            }
        }
    }

    if (events.length === 0) {
        return "No upcoming LoD events in the next 24 hours.";
    }

    return `## LoD Time\n${events.join("\n")}`;
}