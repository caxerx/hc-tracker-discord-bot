-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TodaySubmission', 'OtherDateSubmission');

-- CreateTable
CREATE TABLE "ChannelSetting" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,

    CONSTRAINT "ChannelSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelSetting_channelId_channelType_key" ON "ChannelSetting"("channelId", "channelType");
