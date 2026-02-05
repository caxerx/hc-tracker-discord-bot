import { getDayAverageDeltas } from "@/generated/prisma/sql";
import { prisma } from "@/service/db";

interface RaidData {
  raid: string;
  completed: number;
  target: number;
}

interface RaidDataWithIncrease extends RaidData {
  increased: number;
}

/**
 * Updates the completed progress in the database.
 * Only updates if the new count is higher than the current count.
 * Returns the raid data with the increase indicator.
 */
export async function updateCompletedProgress(
  raidData: RaidData[],
): Promise<RaidDataWithIncrease[]> {
  const result: RaidDataWithIncrease[] = [];

  for (const raid of raidData) {
    // Fetch the current progress from the database
    const existingProgress = await prisma.completedProgress.findUnique({
      where: { raidName: raid.raid },
    });

    let increased = 0;
    const now = new Date();

    if (!existingProgress) {
      // Create new record if it doesn't exist
      await prisma.completedProgress.create({
        data: {
          raidName: raid.raid,
          completedCount: raid.completed,
          lastUpdate: now,
        },
      });
      increased = raid.completed;

      // Create history record (no previous history, assume deltaDay = 1)
      await prisma.completedProgressHistory.create({
        data: {
          raidName: raid.raid,
          completedCount: raid.completed,
          deltaCount: increased,
          deltaDays: 1,
          historyDate: now,
        },
      });
    } else if (raid.completed > existingProgress.completedCount) {
      // Update only if the new count is higher
      increased = raid.completed - existingProgress.completedCount;

      // Calculate days since last update
      const lastUpdateDate = existingProgress.lastUpdate;
      const deltaDays = Math.max(
        1,
        Math.ceil(
          (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      await prisma.completedProgress.update({
        where: { raidName: raid.raid },
        data: {
          completedCount: raid.completed,
          lastUpdate: now,
        },
      });

      // Create history record
      await prisma.completedProgressHistory.create({
        data: {
          raidName: raid.raid,
          completedCount: raid.completed,
          deltaCount: increased,
          deltaDays: deltaDays,
          historyDate: now,
        },
      });
    }
    // If raid.completed <= existingProgress.completedCount, do not update

    result.push({
      ...raid,
      increased,
    });
  }

  return result;
}

export async function formatProgressResponse(
  raidData: Array<{
    raid: string;
    completed: number;
    target: number;
    increased: number;
  }>,
): Promise<string> {
  const dayAverages = await prisma.$queryRawTyped(getDayAverageDeltas());
  const dailyAverageByRaid = new Map(
    dayAverages.map((r) => [
      r.raidName,
      r.dailyAverage != null ? Number(r.dailyAverage) : 0,
    ]),
  );

  // Find the longest raid name for alignment
  const maxNameLength = Math.max(...raidData.map((raid) => raid.raid.length));

  let response = "```\n";
  raidData.forEach((raid) => {
    const percentage = (raid.completed / raid.target) * 100;
    const barLength = 20;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = "|".repeat(filledLength) + ".".repeat(emptyLength);

    // Pad the raid name to align all colons
    const paddedName = raid.raid.padEnd(maxNameLength, " ");

    // Always show increase indicator
    const increaseIndicator = `(+${raid.increased})`;

    // Calculate estimated completion time using day average
    const remaining = raid.target - raid.completed;
    let estimatedTime = "";
    if (raid.completed >= raid.target) {
      estimatedTime = "Completed";
    } else {
      const dailyAverage = dailyAverageByRaid.get(raid.raid) ?? 0;
      if (dailyAverage <= 0) {
        estimatedTime = "Never";
      } else {
        const daysRemaining = Math.ceil(remaining / dailyAverage);
        estimatedTime = `~${daysRemaining}d`;
      }
    }

    response += `${paddedName}: [${progressBar}] ${percentage.toFixed(2)}% ${increaseIndicator} ETA: ${estimatedTime}\n`;
  });
  response += "```";

  return response;
}
