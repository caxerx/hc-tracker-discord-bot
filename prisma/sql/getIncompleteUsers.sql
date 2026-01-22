-- @param {String} $1:raidDate

WITH user_characters AS (
  SELECT DISTINCT
    "registerDiscordUserId" as "discordUserId",
    id as "characterId"
  FROM "RegisterCharacter"
  WHERE "registerDate" <= $1::date
    AND "unregisterDate" >= $1::date
),
user_completions AS (
  SELECT
    uc."discordUserId",
    COUNT(DISTINCT uc."characterId") as "totalCharacters",
    COUNT(DISTINCT CASE
      WHEN EXISTS (
        SELECT 1 FROM "RaidCompletion" rc
        WHERE rc."characterId" = uc."characterId"
          AND rc."raidDate" = $1::date
          AND rc."raidType" = 'Kirollas'
      ) AND EXISTS (
        SELECT 1 FROM "RaidCompletion" rc
        WHERE rc."characterId" = uc."characterId"
          AND rc."raidDate" = $1::date
          AND rc."raidType" = 'Carno'
      )
      THEN uc."characterId"
    END) as "completedCharacters"
  FROM user_characters uc
  GROUP BY uc."discordUserId"
)
SELECT "discordUserId"
FROM user_completions
WHERE "completedCharacters" < "totalCharacters"
ORDER BY "discordUserId"
