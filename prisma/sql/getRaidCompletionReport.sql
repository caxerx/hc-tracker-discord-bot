-- @param {String} $1:selectedDate
-- @param {String} $2:selectedRaid

WITH active_characters AS (
  SELECT DISTINCT ON ("characterName")
    "characterName",
    id
  FROM "RegisterCharacter"
  WHERE "registerDate" <= $1::date
    AND "unregisterDate" >= $1::date
  ORDER BY "characterName", "registerDate" DESC
),
character_completions AS (
  SELECT DISTINCT
    rc."characterName",
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM "RaidCompletion" raid
        WHERE raid."characterId" IN (
          SELECT reg.id
          FROM "RegisterCharacter" reg
          WHERE reg."characterName" = rc."characterName"
            AND reg."registerDate" <= $1::date
            AND reg."unregisterDate" >= $1::date
        )
        AND raid."raidType" = $2
        AND raid."raidDate" = $1::date
      ) THEN true
      ELSE false
    END as "isCompleted"
  FROM "RegisterCharacter" rc
  WHERE rc."registerDate" <= $1::date
    AND rc."unregisterDate" >= $1::date
)
SELECT
  "characterName",
  "isCompleted"
FROM character_completions
ORDER BY "characterName" ASC
