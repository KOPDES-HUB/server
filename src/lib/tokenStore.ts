import { redisConnection } from "../config/redis";

type MemoryEntry = { value: string; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export async function setToken(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  if (redisConnection) {
    await redisConnection.set(key, value, "EX", ttlSeconds);
    return;
  }

  cleanupExpired();
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function getToken(key: string): Promise<string | null> {
  if (redisConnection) {
    return redisConnection.get(key);
  }

  cleanupExpired();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function deleteToken(key: string): Promise<void> {
  if (redisConnection) {
    await redisConnection.del(key);
    return;
  }

  memoryStore.delete(key);
}
