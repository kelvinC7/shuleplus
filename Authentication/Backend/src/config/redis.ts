import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: () => null,
        lazyConnect: true,
      });
    } catch {
      return null;
    }
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.connect();
  } catch {
    // Redis unavailable — non-critical
  }
}
