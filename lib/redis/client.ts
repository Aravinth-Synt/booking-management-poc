import Redis from 'ioredis';
import { memoryStore } from './memoryStore';

declare global {
  // eslint-disable-next-line no-var
  var _redisStore: Redis | typeof memoryStore | undefined;
}

export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

function createClient(): typeof memoryStore | Redis {
  if (global._redisStore) return global._redisStore;

  // Default to memory store — works with no Redis server (dev / demo mode)
  global._redisStore = memoryStore;

  if (!isRedisEnabled()) return global._redisStore;

  const client = new Redis(process.env.REDIS_URL!, {
    retryStrategy:       () => null,
    maxRetriesPerRequest: 0,
    enableOfflineQueue:  false,
    enableReadyCheck:    false,
    connectTimeout:      800,
  });

  client.on('ready', () => {
    console.log('[Redis] connected');
    global._redisStore = client;
  });

  client.on('error', () => {
    if (global._redisStore !== memoryStore) {
      console.warn('[Redis] unavailable — falling back to in-memory store');
      global._redisStore = memoryStore;
    }
  });

  return global._redisStore;
}

export default function getRedisClient(): Redis {
  return (global._redisStore ?? createClient()) as unknown as Redis;
}

export async function pingRedis(): Promise<boolean> {
  if (!isRedisEnabled()) return false;
  try {
    return (await getRedisClient().ping()) === 'PONG';
  } catch {
    return false;
  }
}
