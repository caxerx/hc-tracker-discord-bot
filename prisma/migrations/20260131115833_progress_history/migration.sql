-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RaidType" ADD VALUE 'Zenas';
ALTER TYPE "RaidType" ADD VALUE 'Erenia';
ALTER TYPE "RaidType" ADD VALUE 'Bellia';
ALTER TYPE "RaidType" ADD VALUE 'Paimon';
ALTER TYPE "RaidType" ADD VALUE 'RevenantPaimon';
ALTER TYPE "RaidType" ADD VALUE 'Alzanor';
ALTER TYPE "RaidType" ADD VALUE 'Valehir';
ALTER TYPE "RaidType" ADD VALUE 'Asgobas';

-- CreateTable
CREATE TABLE "CompletedProgressHistory" (
    "id" TEXT NOT NULL,
    "raidName" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "deltaCount" INTEGER NOT NULL,
    "historyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedProgressHistory_pkey" PRIMARY KEY ("id")
);
