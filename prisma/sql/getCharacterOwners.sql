-- @param {String} $1:raidDate

SELECT DISTINCT
  "characterName",
  "registerDiscordUserId" as "discordUserId"
FROM "RegisterCharacter"
WHERE "registerDate" <= $1::date
  AND "unregisterDate" >= $1::date
ORDER BY "characterName", "registerDiscordUserId"
