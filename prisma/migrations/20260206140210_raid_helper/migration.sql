-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('Adventurer', 'Archer', 'Swordman', 'Mage', 'MaterialArtist');

-- CreateEnum
CREATE TYPE "Specialist" AS ENUM ('None', 'Jajamaru', 'Pyjama', 'Chicken', 'Pirate', 'Wedding', 'Angler', 'Chef', 'PetTrainer', 'Ranger', 'Assassin', 'Destroyer', 'WildKeeper', 'FierCannoneer', 'Scout', 'DemonHunter', 'AvengingAngel', 'Sunchaser', 'Blaster', 'FogHunter', 'Warrior', 'Ninja', 'Crusader', 'Berserker', 'Gladiator', 'BattleMonk', 'DeathReaper', 'Renegade', 'WaterfallBerserker', 'DragonKnight', 'StoneBreaker', 'RedMagician', 'HolyMage', 'BlueMagician', 'DarkGunner', 'Volcano', 'TideLord', 'Seer', 'Archmage', 'VoodooPriest', 'Gravity', 'FireStorm', 'DraconicFist', 'MysticArts', 'MaterWolf', 'DemonWarrior', 'FlameDruid', 'HydraulicFist', 'Thunderer');

-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE 'RaidEvent';

-- CreateTable
CREATE TABLE "RaidEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "eventOrganizerDiscordUserId" TEXT NOT NULL,
    "eventDescription" TEXT,
    "eventId" TEXT,

    CONSTRAINT "RaidEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordEvent" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "DiscordEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidEventParticipant" (
    "id" TEXT NOT NULL,
    "raidEventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "specialist" "Specialist" NOT NULL,

    CONSTRAINT "RaidEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSetting" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "characterClass" "CharacterClass" NOT NULL,
    "defaultSpecialist" "Specialist" NOT NULL,

    CONSTRAINT "CharacterSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidEvent_eventId_key" ON "RaidEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordEvent_eventId_key" ON "DiscordEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSetting_characterId_key" ON "CharacterSetting"("characterId");

-- AddForeignKey
ALTER TABLE "RaidEvent" ADD CONSTRAINT "RaidEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DiscordEvent"("eventId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidEventParticipant" ADD CONSTRAINT "RaidEventParticipant_raidEventId_fkey" FOREIGN KEY ("raidEventId") REFERENCES "RaidEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidEventParticipant" ADD CONSTRAINT "RaidEventParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "RegisterCharacter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSetting" ADD CONSTRAINT "CharacterSetting_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "RegisterCharacter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
