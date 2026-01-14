/*
  Warnings:

  - The column `messageId` on the `RaidCompletionEvidence` table will be renamed to `messageUrl`.

*/
-- AlterTable
ALTER TABLE "RaidCompletionEvidence" RENAME COLUMN "messageId" TO "messageUrl";
