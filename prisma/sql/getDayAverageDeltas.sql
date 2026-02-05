-- Calculate the daily average completion rate for each raid
-- Uses deltaCount / deltaDays to get the rate for each period, then averages them
-- GREATEST ensures deltaDays is at least 1 to prevent division errors
SELECT
  "raidName",
  AVG(CAST("deltaCount" AS DECIMAL) / GREATEST("deltaDays", 1)) AS "dailyAverage"
FROM "CompletedProgressHistory"
GROUP BY "raidName"
ORDER BY "raidName"
