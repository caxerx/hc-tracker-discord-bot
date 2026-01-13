/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `RaidCompletionEvidence` table. All the data in the column will be lost.
  - Added the required column `messageId` to the `RaidCompletionEvidence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RaidCompletionEvidence" DROP COLUMN "imageUrl",
ADD COLUMN     "messageId" TEXT NOT NULL;
