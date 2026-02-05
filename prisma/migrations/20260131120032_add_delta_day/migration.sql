/*
  Warnings:

  - Added the required column `deltaDays` to the `CompletedProgressHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CompletedProgressHistory" ADD COLUMN     "deltaDays" INTEGER NOT NULL;
