import { createClient, type RedisClientType } from 'redis';
import { memoryStore } from './memoryStore';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  mget(keys: string[]): Promise<(string | null)[]>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  ping(): Promise<string>;
}

interface RedisConnection extends RedisLike {
  isOpen: boolean;
  connect(): Promise<RedisConnection>;
}

type RedisStore = RedisConnection;

declare global {
  // eslint-disable-next-line no-var
  var _redisStore: RedisStore | typeof memoryStore | undefined;
  // eslint-disable-next-line no-var
  var _redisClient: RedisStore | undefined;
  // eslint-disable-next-line no-var
  var _redisConnectPromise: Promise<RedisStore | typeof memoryStore> | undefined;
}

export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function isRedisFallbackStore(client: RedisStore | typeof memoryStore): client is typeof memoryStore {
  return client === memoryStore;
}

function hasUsableRedisClient(client: RedisStore | undefined): client is RedisStore {
  return Boolean(client?.isOpen);
}

function resetRedisClient() {
  global._redisClient = undefined;
  global._redisStore = undefined;
  global._redisConnectPromise = undefined;
}

function fallbackToMemoryStore() {
  resetRedisClient();
  global._redisStore = memoryStore;
  return memoryStore;
}

function createRedisClient(): { client: RedisClientType; store: RedisStore } {
  const client: RedisClientType = createClient({
    url: process.env.REDIS_URL!,
    socket: {
      connectTimeout: 2000,
      reconnectStrategy: false,
    },
  });

  client.on('ready', () => {
    console.log('[Redis] connected');
  });

  client.on('error', (error) => {
    console.warn('[Redis] connection error:', error.message);
  });

  client.on('end', () => {
    console.warn('[Redis] connection closed');
    if (global._redisClient === store) {
      resetRedisClient();
    }
  });

  const store: RedisStore = {
    get: (key) => client.get(key),
    async set(key, value, ...args) {
      let ttlSeconds: number | undefined;
      for (let i = 0; i < args.length; i += 1) {
        const token = String(args[i]).toUpperCase();
        if (token === 'EX') ttlSeconds = Number(args[i + 1]);
      }
      const result = await client.set(key, value, ttlSeconds ? { EX: ttlSeconds } : undefined);
      return result ?? null;
    },
    del: (...keys) => client.del(keys),
    mget: (keys) => client.mGet(keys),
    zadd: (key, score, member) => client.zAdd(key, [{ score, value: member }]),
    zrem: (key, ...members) => client.zRem(key, members),
    zremrangebyscore: (key, min, max) => client.zRemRangeByScore(key, min, max),
    zrange: async (key, start, stop) => {
      const end = stop < 0 ? stop : stop;
      return client.zRange(key, start, end);
    },
    ping: () => client.ping(),
    async connect() {
      await client.connect();
      return store;
    },
    get isOpen() {
      return client.isOpen;
    },
  };

  return { client, store };
}

function createClientIfNeeded(): RedisStore | typeof memoryStore {
  if (global._redisStore) {
    if (isRedisFallbackStore(global._redisStore)) return global._redisStore;
    if (hasUsableRedisClient(global._redisStore)) return global._redisStore;
    resetRedisClient();
  }

  if (!isRedisEnabled()) {
    global._redisStore = memoryStore;
    return global._redisStore;
  }

  if (!global._redisClient) {
    const { store } = createRedisClient();
    global._redisClient = store;
    global._redisStore = store;
  }

  return global._redisStore;
}

export default function getRedisClient(): RedisStore | typeof memoryStore {
  return global._redisStore ?? createClientIfNeeded();
}

export async function ensureRedisReady(): Promise<RedisStore | typeof memoryStore> {
  const client = createClientIfNeeded();

  if (isRedisFallbackStore(client)) return client;
  if (client.isOpen) return client;

  if (!global._redisConnectPromise) {
    global._redisConnectPromise = client.connect()
      .then(() => {
        global._redisStore = client;
        global._redisConnectPromise = undefined;
        return client;
      })
      .catch(() => {
        global._redisConnectPromise = undefined;
        return fallbackToMemoryStore();
      });
  }

  return global._redisConnectPromise;
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
