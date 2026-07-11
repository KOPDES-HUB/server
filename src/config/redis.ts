import "dotenv/config";
import type { Redis as RedisType } from "ioredis";
import Redis from "ioredis";

export function isRedisEnabled(): boolean {
  const flag = process.env.REDIS_ENABLED?.toLowerCase();
  return flag === "true" || flag === "1";
}

function createRedisConnection(): RedisType | null {
  if (!isRedisEnabled()) {
    console.log(
      "ℹ️ Redis disabled. Notifications use direct send, tokens use in-memory store.",
    );
    return null;
  }

  const options = {
    maxRetriesPerRequest: null as null,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  };

  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, options)
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        ...options,
      });

  client.on("connect", () => console.log("✅ Redis connected"));
  client.on("error", (err) => console.error("❌ Redis error:", err.message));

  client.connect().catch((err) => {
    console.error("❌ Redis connection failed:", err.message);
  });

  return client;
}

export const redisConnection = createRedisConnection();
