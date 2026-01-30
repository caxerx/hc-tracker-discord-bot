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

    if (!existingProgress) {
      // Create new record if it doesn't exist
      await prisma.completedProgress.create({
        data: {
          raidName: raid.raid,
          completedCount: raid.completed,
          lastUpdate: new Date(),
        },
      });
      increased = raid.completed;
    } else if (raid.completed > existingProgress.completedCount) {
      // Update only if the new count is higher
      increased = raid.completed - existingProgress.completedCount;
      await prisma.completedProgress.update({
        where: { raidName: raid.raid },
        data: {
          completedCount: raid.completed,
          lastUpdate: new Date(),
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

export function formatProgressResponse(
  raidData: Array<{
    raid: string;
    completed: number;
    target: number;
    increased: number;
  }>,
): string {
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

    // Calculate estimated completion time
    const remaining = raid.target - raid.completed;
    let estimatedTime = "";
    if (raid.completed >= raid.target) {
      estimatedTime = "Completed";
    } else if (raid.increased === 0) {
      estimatedTime = "Never";
    } else {
      const daysRemaining = Math.ceil(remaining / raid.increased);
      estimatedTime = `~${daysRemaining}d`;
    }

    response += `${paddedName}: [${progressBar}] ${percentage.toFixed(2)}% ${increaseIndicator} ETA: ${estimatedTime}\n`;
  });
  response += "```";

  return response;
}
