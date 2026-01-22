import { prisma } from '../db';
import { format } from 'date-fns';
import { getIncompleteCharacters as getIncompleteCharactersQuery } from '../generated/prisma/sql/getIncompleteCharacters';

/**
 * Get list of character names who have not completed all raids for a specific date
 * A character is considered incomplete if they haven't completed both Kirollas AND Carno raids
 */
export async function getIncompleteCharacters(raidDate: Date): Promise<string[]> {
  const dateStr = format(raidDate, 'yyyy-MM-dd');

  const results = await prisma.$queryRawTyped(getIncompleteCharactersQuery(dateStr));

  return results.map(r => r.characterName);
}
