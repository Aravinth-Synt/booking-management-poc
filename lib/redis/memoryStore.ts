/**
 * In-memory Redis-compatible store for local dev when no Redis server is running.
 * Supports the subset used by roomLock.ts: GET, SET (EX, NX), DEL, TTL, PING.
 */

interface Entry { value: string; expiresAt: number | null }

const store = new Map<string, Entry>();

function isAlive(e: Entry) {
  return !e.expiresAt || Date.now() < e.expiresAt;
}

export const memoryStore = {
  // ioredis emits events — no-ops here
  on: (_event: string, _cb: unknown) => memoryStore,

  async ping() { return 'PONG'; },

  async get(key: string): Promise<string | null> {
    const e = store.get(key);
    if (!e) return null;
    if (!isAlive(e)) { store.delete(key); return null; }
    return e.value;
  },

  async set(key: string, value: string, ...args: (string | number)[]): Promise<string | null> {
    let ttl: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]).toUpperCase();
      if (a === 'EX') ttl = Number(args[++i]);
      if (a === 'NX') nx = true;
    }
    if (nx) {
      const existing = store.get(key);
      if (existing && isAlive(existing)) return null; // NX: only set if not exists
    }
    store.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : null });
    return 'OK';
  },

  async del(key: string): Promise<number> {
    store.delete(key);
    return 1;
  },

  async ttl(key: string): Promise<number> {
    const e = store.get(key);
    if (!e || !isAlive(e)) return -2;
    if (!e.expiresAt) return -1;
    return Math.max(0, Math.floor((e.expiresAt - Date.now()) / 1000));
  },
};
