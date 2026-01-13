-- CreateTable
CREATE TABLE "RegisterCharacter" (
    "id" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "registerDiscordUserId" TEXT NOT NULL,
    "registerDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unregisterDate" DATE DEFAULT '2099-12-31 23:59:59.999 +00:00',

    CONSTRAINT "RegisterCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidCompletion" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "raidDate" DATE NOT NULL,

    CONSTRAINT "RaidCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidCompletionEvidence" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "raidDate" DATE NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "RaidCompletionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegisterCharacter_registerDiscordUserId_registerDate_unregi_idx" ON "RegisterCharacter"("registerDiscordUserId", "registerDate", "unregisterDate");

-- CreateIndex
CREATE INDEX "RaidCompletion_characterId_raidDate_idx" ON "RaidCompletion"("characterId", "raidDate");

-- CreateIndex
CREATE INDEX "RaidCompletionEvidence_characterId_raidDate_idx" ON "RaidCompletionEvidence"("characterId", "raidDate");

-- AddForeignKey
ALTER TABLE "RaidCompletion" ADD CONSTRAINT "RaidCompletion_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "RegisterCharacter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidCompletionEvidence" ADD CONSTRAINT "RaidCompletionEvidence_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "RegisterCharacter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
