-- @param {String} $1:characterName
-- @param {String} $2:raidDate

SELECT DISTINCT
  rc."raidType",
  reg."registerDiscordUserId" as "discordUserId",
  reg."id" as "characterId"
FROM "RaidCompletion" rc
INNER JOIN "RegisterCharacter" reg ON rc."characterId" = reg.id
WHERE reg."characterName" = $1
  AND rc."raidDate" = $2::date
ORDER BY rc."raidType", reg."registerDiscordUserId"
