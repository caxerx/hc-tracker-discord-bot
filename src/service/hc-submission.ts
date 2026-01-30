import type { RaidType } from "@/generated/prisma/enums";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import client from "@/app";

export interface CompleteFormData {
  userId: string;
  raidDate: Date;
  raidTypes: readonly RaidType[];
  characterIds: readonly string[];
  evidenceMessageUrl?: string;
}

export async function createCompleteRecord(
  formData: CompleteFormData,
): Promise<void> {
  const records = formData.raidTypes.flatMap((raid) =>
    formData.characterIds.map(
      (character) =>
        ({
          raidDate: formData.raidDate,
          raidType: raid,
          characterId: character,
        }) satisfies Prisma.RaidCompletionCreateManyInput,
    ),
  );

  await prisma.raidCompletion.createMany({
    data: records,
    skipDuplicates: true,
  });

  if (!formData.evidenceMessageUrl) return;

  await prisma.raidCompletionEvidence.create({
    data: {
      discordUserId: formData.userId,
      raidDate: formData.raidDate,
      messageUrl: formData.evidenceMessageUrl,
    },
  });
}
