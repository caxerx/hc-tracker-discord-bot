-- @param {String} $1:raidDate

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
  SELECT
    ac."characterName",
    COUNT(DISTINCT CASE WHEN rc."raidType" = 'Kirollas' THEN 1 END) as "kirollasCompleted",
    COUNT(DISTINCT CASE WHEN rc."raidType" = 'Carno' THEN 1 END) as "carnoCompleted"
  FROM active_characters ac
  LEFT JOIN "RaidCompletion" rc
    ON rc."characterId" = ac.id
    AND rc."raidDate" = $1::date
  GROUP BY ac."characterName"
)
SELECT "characterName"
FROM character_completions
WHERE "kirollasCompleted" = 0 OR "carnoCompleted" = 0
ORDER BY "characterName" ASC
