-- CreateTable
CREATE TABLE "CompletedProgress" (
    "id" TEXT NOT NULL,
    "raidName" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompletedProgress_raidName_key" ON "CompletedProgress"("raidName");
