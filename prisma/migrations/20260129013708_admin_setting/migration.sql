-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_discordUserId_key" ON "UserSetting"("discordUserId");

-- CreateIndex
CREATE INDEX "UserSetting_discordUserId_idx" ON "UserSetting"("discordUserId");
