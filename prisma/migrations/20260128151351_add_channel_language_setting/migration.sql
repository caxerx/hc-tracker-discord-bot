-- CreateEnum
CREATE TYPE "Language" AS ENUM ('Chinese', 'English');

-- AlterTable
ALTER TABLE "ChannelSetting" ADD COLUMN     "channelLanguage" "Language" NOT NULL DEFAULT 'English';
