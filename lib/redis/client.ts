import Redis from 'ioredis';
import { memoryStore } from './memoryStore';

declare global {
  // eslint-disable-next-line no-var
  var _redisStore: Redis | typeof memoryStore | undefined;
  // eslint-disable-next-line no-var
  var _redisClient: Redis | undefined;
}

export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function isRedisFallbackStore(client: Redis | typeof memoryStore): client is typeof memoryStore {
  return client === memoryStore;
}

function hasUsableRedisClient(client: Redis | undefined): client is Redis {
  if (!client) return false;
  return !['end', 'close'].includes(client.status);
}

function resetRedisClient() {
  global._redisClient = undefined;
  global._redisStore = undefined;
}

function fallbackToMemoryStore() {
  resetRedisClient();
  global._redisStore = memoryStore;
  return memoryStore;
}

function createClient(): Redis | typeof memoryStore {
  if (global._redisStore) {
    if (isRedisFallbackStore(global._redisStore)) return global._redisStore;
    if (hasUsableRedisClient(global._redisStore)) return global._redisStore;
    resetRedisClient();
  }

  if (!isRedisEnabled()) {
    global._redisStore = memoryStore;
    return global._redisStore;
  }

  if (!hasUsableRedisClient(global._redisClient)) {
    const client = new Redis(process.env.REDIS_URL!, {
      retryStrategy:       () => null,
      maxRetriesPerRequest: 1,
      enableOfflineQueue:  false,
      lazyConnect:         true,
      connectTimeout:      2000,
    });

    client.on('ready', () => {
      console.log('[Redis] connected');
    });

    client.on('error', (error) => {
      console.warn('[Redis] connection error:', error.message);
    });

    client.on('end', () => {
      console.warn('[Redis] connection closed');
      if (global._redisClient === client) {
        resetRedisClient();
      }
    });

    global._redisClient = client;
  }

  global._redisStore = global._redisClient;
  return global._redisStore;
}

export default function getRedisClient(): Redis | typeof memoryStore {
  return global._redisStore ?? createClient();
}

export async function ensureRedisReady(): Promise<Redis | typeof memoryStore> {
  const client = createClient();

  if (isRedisFallbackStore(client)) return client;

  try {
    if (client.status === 'wait') {
      await client.connect();
    } else if (['end', 'close'].includes(client.status)) {
      resetRedisClient();
      return ensureRedisReady();
    }
  } catch {
    return fallbackToMemoryStore();
  }

  return client;
}

export async function pingRedis(): Promise<boolean> {
  if (!isRedisEnabled()) return false;
  try {
    const client = await ensureRedisReady();
    if (isRedisFallbackStore(client)) return false;
    return (await client.ping()) === 'PONG';
  } catch {
    return false;
  }
}
