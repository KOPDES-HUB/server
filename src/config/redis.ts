import Redis from "ioredis";

let redisConnection: Redis | null = null;

if (process.env.REDIS_HOST) {
  redisConnection = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  redisConnection.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redisConnection.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });
} else {
  console.warn("⚠️ REDIS_HOST not configured. Redis disabled.");
}

export { redisConnection };