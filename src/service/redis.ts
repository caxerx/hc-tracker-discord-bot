import { Logger } from "commandkit";
import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

export const redis = new Redis(process.env.REDIS_URL);
redis.on("connect", () => {
  Logger.info("Redis connected");
});

redis.on("error", (error) => {
  Logger.error(`Redis connection error: ${error}`);
});
