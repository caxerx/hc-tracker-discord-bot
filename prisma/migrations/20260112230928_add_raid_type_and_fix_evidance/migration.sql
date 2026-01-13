/*
  Warnings:

  - You are about to drop the column `characterId` on the `RaidCompletionEvidence` table. All the data in the column will be lost.
  - Added the required column `raidType` to the `RaidCompletion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discordUserId` to the `RaidCompletionEvidence` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RaidCompletionEvidence" DROP CONSTRAINT "RaidCompletionEvidence_characterId_fkey";

-- DropIndex
DROP INDEX "RaidCompletionEvidence_characterId_raidDate_idx";

-- AlterTable
ALTER TABLE "RaidCompletion" ADD COLUMN     "raidType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RaidCompletionEvidence" DROP COLUMN "characterId",
ADD COLUMN     "discordUserId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RaidCompletionEvidence_discordUserId_raidDate_idx" ON "RaidCompletionEvidence"("discordUserId", "raidDate");
