-- @param {String} $1:periodStart
-- @param {String} $2:periodEnd
-- @param {String} $3:raidType

SELECT
  rc."characterName",
  COALESCE(COUNT(DISTINCT DATE(raid."raidDate")), 0) as "completionCount"
FROM "RegisterCharacter" rc
LEFT JOIN "RaidCompletion" raid
  ON raid."characterId" = rc.id
  AND raid."raidType" = $3
  AND raid."raidDate" >= $1::date
  AND raid."raidDate" <= $2::date
WHERE rc."unregisterDate" >= $2::date
GROUP BY rc."characterName"
ORDER BY "completionCount" DESC, rc."characterName" ASC
