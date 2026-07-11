// import { Redis } from "ioredis";

// export const redisConnection = new Redis({
//   host: process.env.REDIS_HOST || "localhost",
//   port: Number(process.env.REDIS_PORT) || 6379,
//   maxRetriesPerRequest: null,
// });

// redisConnection.on("connect", () => console.log("✅ Redis connected"));
// redisConnection.on("error", (err) => console.error("❌ Redis error:", err));

import Redis from "ioredis";

export const redisConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : null;

if (redisConnection) {
  redisConnection.on("connect", () => {
    console.log("✅ Redis connected");
  });

  redisConnection.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });
} else {
  console.log("⚠️ Redis disabled");
}