import getRedisClient from './client';
import type { RoomLock, LockStatusResponse } from '@/types';

const LOCK_TTL    = 600; // 10 minutes
const SLOT_KEY    = (roomId: string)                  => `room:res:${roomId}`;
const DETAIL_KEY  = (roomId: string, sid: string)     => `room:res:${roomId}:${sid}`;
const CONFIRM_KEY = (roomId: string, sid: string)     => `room:confirmed:${roomId}:${sid}`;

function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return new Date(aIn).getTime() < new Date(bOut).getTime() &&
         new Date(bIn).getTime() < new Date(aOut).getTime();
}

function makeReference(): string {
  return `LSY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

async function sweepAndGetMembers(roomId: string) {
  const redis = getRedisClient();
  // Remove entries whose score (expiresAt ms) is in the past
  await redis.zremrangebyscore(SLOT_KEY(roomId), '-inf', Date.now() - 1);
  const members = await redis.zrange(SLOT_KEY(roomId), 0, -1);
  return { redis, members };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function reserveSlot(
  roomId: string,
  sessionId: string,
  inventory: number,
  checkIn?: string,
  checkOut?: string,
  guestName?: string,
): Promise<{ success: boolean; slotsUsed: number; inventory: number; expiresAt: string; lock?: RoomLock }> {
  const expiresAt = new Date(Date.now() + LOCK_TTL * 1000).toISOString();

  try {
    const { redis, members } = await sweepAndGetMembers(roomId);

    const detailKeys = members.map(sid => DETAIL_KEY(roomId, sid));
    const raws: (string | null)[] = detailKeys.length > 0 ? await redis.mget(detailKeys) : [];
    const details: RoomLock[]     = raws.flatMap(r => r ? [JSON.parse(r) as RoomLock] : []);

    // Idempotent — session already holds a slot
    const existing = details.find(d => d.sessionId === sessionId);
    if (existing) {
      return { success: true, slotsUsed: details.length, inventory, expiresAt: existing.expiresAt, lock: existing };
    }

    // Count only slots that overlap with the requested dates
    const conflicting = checkIn && checkOut
      ? details.filter(d => d.checkIn && d.checkOut && datesOverlap(checkIn, checkOut, d.checkIn, d.checkOut))
      : details;

    if (conflicting.length >= inventory) {
      return { success: false, slotsUsed: conflicting.length, inventory, expiresAt };
    }

    const lock: RoomLock = {
      roomId, sessionId,
      lockedAt: new Date().toISOString(),
      expiresAt, guestName, checkIn, checkOut,
    };
    await redis.zadd(SLOT_KEY(roomId), new Date(expiresAt).getTime(), sessionId);
    await redis.set(DETAIL_KEY(roomId, sessionId), JSON.stringify(lock), 'EX', LOCK_TTL);

    return { success: true, slotsUsed: conflicting.length + 1, inventory, expiresAt, lock };
  } catch {
    // Redis unavailable — allow the booking to proceed
    const lock: RoomLock = { roomId, sessionId, lockedAt: new Date().toISOString(), expiresAt, guestName, checkIn, checkOut };
    return { success: true, slotsUsed: 1, inventory, expiresAt, lock };
  }
}

export async function releaseSlot(roomId: string, sessionId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.zrem(SLOT_KEY(roomId), sessionId);
    await redis.del(DETAIL_KEY(roomId, sessionId));
    return true;
  } catch {
    return true;
  }
}

export async function confirmSlot(roomId: string, sessionId: string): Promise<string> {
  const bookingReference = makeReference();
  try {
    const redis = getRedisClient();
    const raw   = await redis.get(DETAIL_KEY(roomId, sessionId));
    if (raw) {
      const detail: RoomLock = JSON.parse(raw);
      if (detail.sessionId !== sessionId) throw new Error('Session mismatch — reservation belongs to another guest');
    }
    await redis.set(CONFIRM_KEY(roomId, sessionId), JSON.stringify({ bookingReference, confirmedAt: new Date().toISOString() }));
    await redis.zrem(SLOT_KEY(roomId), sessionId);
    await redis.del(DETAIL_KEY(roomId, sessionId));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('Session mismatch')) throw err;
  }
  return bookingReference;
}

export async function getSlotStatus(
  roomId: string,
  checkIn?: string,
  checkOut?: string,
  inventory = 5,
): Promise<LockStatusResponse> {
  try {
    const { redis, members } = await sweepAndGetMembers(roomId);

    if (members.length === 0) {
      return { status: 'available', slotsAvailable: inventory, slotsTotal: inventory };
    }

    const detailKeys = members.map(sid => DETAIL_KEY(roomId, sid));
    const raws: (string | null)[] = await redis.mget(detailKeys);
    const details: RoomLock[]     = raws.flatMap(r => r ? [JSON.parse(r) as RoomLock] : []);

    const conflicting = checkIn && checkOut
      ? details.filter(d => d.checkIn && d.checkOut && datesOverlap(checkIn, checkOut, d.checkIn, d.checkOut))
      : details;

    const slotsUsed      = conflicting.length;
    const slotsAvailable = Math.max(0, inventory - slotsUsed);
    const status: 'locked' | 'available' = slotsAvailable === 0 ? 'locked' : 'available';

    const first = conflicting[0];
    const secondsRemaining = first
      ? Math.max(0, Math.floor((new Date(first.expiresAt).getTime() - Date.now()) / 1000))
      : undefined;

    let dateConflict: boolean | undefined;
    if (checkIn && checkOut && first?.checkIn && first?.checkOut) {
      dateConflict = datesOverlap(checkIn, checkOut, first.checkIn, first.checkOut);
    }

    return { status, lock: first, secondsRemaining, dateConflict, slotsAvailable, slotsTotal: inventory };
  } catch {
    return { status: 'available', slotsAvailable: inventory, slotsTotal: inventory };
  }
}

export async function isSessionSlotActive(roomId: string, sessionId: string): Promise<boolean> {
  try {
    const raw = await getRedisClient().get(DETAIL_KEY(roomId, sessionId));
    return raw !== null;
  } catch {
    return true; // Redis unavailable — allow checkout to complete
  }
}

// ─── Backward-compat aliases (used by bookingService and existing routes) ─────

export const acquireRoomLock = (
  roomId: string, sessionId: string, checkIn?: string, checkOut?: string, guestName?: string,
) => reserveSlot(roomId, sessionId, 5, checkIn, checkOut, guestName)
  .then(r => ({
    success: r.success,
    lock: r.lock ?? { roomId, sessionId, lockedAt: new Date().toISOString(), expiresAt: r.expiresAt },
    expiresAt: r.expiresAt,
  }));

export const releaseRoomLock        = releaseSlot;
export const confirmRoomLock        = confirmSlot;
export const getRoomLockStatus      = (roomId: string, checkIn?: string, checkOut?: string, inventory?: number) =>
  getSlotStatus(roomId, checkIn, checkOut, inventory);
export const isRoomLockedBySession  = isSessionSlotActive;
