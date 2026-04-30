import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() ?? '';
}

export function isRedisEnabled(): boolean {
  return Boolean(getRedisUrl());
}

export default function getRedisClient(): Redis {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    throw new Error('Redis is not configured. Set REDIS_URL to enable cache and booking locks.');
  }

  if (global._redis) return global._redis;

  const client = new Redis(redisUrl, {
    retryStrategy: (times) => Math.min(times * 200, 5000),
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    connectTimeout: 1000,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.warn('[Redis] connection error:', err.message);
  });

  global._redis = client;
  return client;
}

export async function pingRedis(): Promise<boolean> {
  if (!isRedisEnabled()) return false;

  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
