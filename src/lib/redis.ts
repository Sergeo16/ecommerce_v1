/**
 * Client Redis pour BullMQ, cache, rate limit
 */
import Redis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis: Redis =
  globalForRedis.redis ??
  new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export function getRedisConnection(): Redis {
  return new Redis(url, { maxRetriesPerRequest: 3 });
}
