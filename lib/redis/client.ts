import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

export default function getRedisClient(): Redis {
  if (global._redis) return global._redis;

  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 200, 5000),
    maxRetriesPerRequest: 1,   // fail after 1 retry — no long waits per command
    enableOfflineQueue: false, // reject immediately when not connected
    enableReadyCheck: false,
    connectTimeout: 500,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.warn('[Redis] connection error:', err.message);
  });

  global._redis = client;
  return client;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
