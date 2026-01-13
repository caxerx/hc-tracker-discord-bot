/*
  Warnings:

  - Changed the type of `raidType` on the `RaidCompletion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RaidType" AS ENUM ('Kirollas', 'Carno');

-- AlterTable
ALTER TABLE "RaidCompletion" DROP COLUMN "raidType",
ADD COLUMN     "raidType" "RaidType" NOT NULL;
