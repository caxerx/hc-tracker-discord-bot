import { format } from 'date-fns';
import { getIncompleteCharacters as getIncompleteCharactersQuery } from '@/generated/prisma/sql/getIncompleteCharacters';
import { getCharacterOwners as getCharacterOwnersQuery } from '@/generated/prisma/sql/getCharacterOwners';
import { getIncompleteUsers as getIncompleteUsersQuery } from '@/generated/prisma/sql/getIncompleteUsers';
import { prisma } from './db';
import { getServerToday } from '@/utils/date';

/**
 * Get list of character names who have not completed all raids for a specific date
 * A character is considered incomplete if they haven't completed both Kirollas AND Carno raids
 */
export async function getIncompleteCharacters(raidDate: Date): Promise<string[]> {
  const dateStr = format(raidDate, 'yyyy-MM-dd');

  const results = await prisma.$queryRawTyped(getIncompleteCharactersQuery(dateStr));

  return results.map(r => r.characterName);
}

/**
 * Get a map of character names to their Discord user IDs for a specific date
 * A character can have multiple owners
 */
export async function getCharacterOwners(raidDate: Date): Promise<Map<string, string[]>> {
  const dateStr = format(raidDate, 'yyyy-MM-dd');

  const results = await prisma.$queryRawTyped(getCharacterOwnersQuery(dateStr));

  const ownerMap = new Map<string, string[]>();
  for (const result of results) {
    const owners = ownerMap.get(result.characterName) || [];
    owners.push(result.discordUserId);
    ownerMap.set(result.characterName, owners);
  }

  return ownerMap;
}

/**
 * Get a set of Discord user IDs who have not completed all raids on all their characters for a specific date
 * A user is considered incomplete if any of their characters hasn't completed both Kirollas AND Carno raids
 */
export async function getIncompleteUsers(raidDate: Date): Promise<Set<string>> {
  const dateStr = format(raidDate, 'yyyy-MM-dd');

  const results = await prisma.$queryRawTyped(getIncompleteUsersQuery(dateStr));

  return new Set(results.map(r => r.discordUserId));
}

export async function getCharactersOwners(characters: string[], raidDate: Date): Promise<Set<string>> {
  const dateStr = format(raidDate, 'yyyy-MM-dd');

  const results = await prisma.$queryRawTyped(getCharacterOwnersQuery(dateStr));

  const ownerSet = new Set<string>();
  for (const result of results) {
    if (characters.includes(result.characterName)) {
      ownerSet.add(result.discordUserId);
    }
  }

  return ownerSet;
}

export async function getCharactersByOwner(ownerDiscordUserId: string, raidDate: Date) {
  const results = await prisma.registerCharacter.findMany({
    where: {
      registerDiscordUserId: ownerDiscordUserId,
      unregisterDate: {
        gte: raidDate,
      },
    },
  });

  return results
}