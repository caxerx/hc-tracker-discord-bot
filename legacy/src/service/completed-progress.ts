import { prisma } from '../db';

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
  raidData: RaidData[]
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
