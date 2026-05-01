/**
 * In-memory Redis-compatible store for local dev when no Redis server is running.
 * Supports the subset used by roomLock.ts: GET, SET (EX, NX), DEL, TTL, PING,
 * MGET, ZADD, ZREM, ZREMRANGEBYSCORE, ZRANGE.
 */

interface Entry { value: string; expiresAt: number | null }

const store     = new Map<string, Entry>();
const zsetStore = new Map<string, Map<string, number>>(); // key → (member → score)

function isAlive(e: Entry) {
  return !e.expiresAt || Date.now() < e.expiresAt;
}

export const memoryStore = {
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
      if (existing && isAlive(existing)) return null;
    }
    store.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : null });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) { if (store.delete(key)) count++; }
    return count;
  },

  async ttl(key: string): Promise<number> {
    const e = store.get(key);
    if (!e || !isAlive(e)) return -2;
    if (!e.expiresAt) return -1;
    return Math.max(0, Math.floor((e.expiresAt - Date.now()) / 1000));
  },

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(k => memoryStore.get(k)));
  },

  // ─── Sorted Set ────────────────────────────────────────────────────────────

  async zadd(key: string, score: number, member: string): Promise<number> {
    let zset = zsetStore.get(key);
    if (!zset) { zset = new Map(); zsetStore.set(key, zset); }
    const isNew = !zset.has(member);
    zset.set(member, score);
    return isNew ? 1 : 0;
  },

  async zrem(key: string, ...members: string[]): Promise<number> {
    const zset = zsetStore.get(key);
    if (!zset) return 0;
    let count = 0;
    for (const m of members) { if (zset.delete(m)) count++; }
    return count;
  },

  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    const zset = zsetStore.get(key);
    if (!zset) return 0;
    const lo = min === '-inf' ? -Infinity : Number(min);
    const hi = max === '+inf' ?  Infinity : Number(max);
    const toDelete: string[] = [];
    Array.from(zset.entries()).forEach(([member, score]) => {
      if (score >= lo && score <= hi) toDelete.push(member);
    });
    for (const m of toDelete) zset.delete(m);
    return toDelete.length;
  },

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const zset = zsetStore.get(key);
    if (!zset) return [];
    const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]).map(([m]) => m);
    const end = stop < 0 ? sorted.length + stop + 1 : stop + 1;
    return sorted.slice(start, end);
  },
};
