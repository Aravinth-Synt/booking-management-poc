import { ensureRedisReady, isRedisEnabled, isRedisFallbackStore } from './client';
import type { RoomLock, LockStatusResponse } from '@/types';

const LOCK_TTL    = 600; // 10 minutes
const SLOT_KEY    = (roomId: string)              => `room:res:${roomId}`;
const DETAIL_KEY  = (roomId: string, sid: string) => `room:res:${roomId}:${sid}`;
const CONFIRM_KEY = (roomId: string, sid: string) => `room:confirmed:${roomId}:${sid}`;

function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return new Date(aIn).getTime() < new Date(bOut).getTime() &&
         new Date(bIn).getTime() < new Date(aOut).getTime();
}

function makeReference(): string {
  return `LSY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

async function getOperationalRedis() {
  const redis = await ensureRedisReady();

  if (isRedisEnabled() && isRedisFallbackStore(redis)) {
    throw new Error('Redis is configured but unavailable');
  }

  return redis;
}

async function sweepAndGetMembers(roomId: string) {
  const redis = await getOperationalRedis();
  await redis.zremrangebyscore(SLOT_KEY(roomId), '-inf', Date.now() - 1);
  const members = await redis.zrange(SLOT_KEY(roomId), 0, -1);
  return { redis, members };
}

export async function reserveSlot(
  roomId: string,
  sessionId: string,
  inventory: number,
  checkIn?: string,
  checkOut?: string,
  guestName?: string,
): Promise<{ success: boolean; slotsUsed: number; inventory: number; expiresAt: string; lock?: RoomLock }> {
  const expiresAt = new Date(Date.now() + LOCK_TTL * 1000).toISOString();
  const { redis, members } = await sweepAndGetMembers(roomId);

  const detailKeys = members.map((sid) => DETAIL_KEY(roomId, sid));
  const raws: (string | null)[] = detailKeys.length > 0 ? await redis.mget(detailKeys) : [];
  const details: RoomLock[] = raws.flatMap((raw) => raw ? [JSON.parse(raw) as RoomLock] : []);

  const existing = details.find((detail) => detail.sessionId === sessionId);
  if (existing) {
    const existingConflicts = checkIn && checkOut
      ? details.filter((detail) => detail.checkIn && detail.checkOut && datesOverlap(checkIn, checkOut, detail.checkIn, detail.checkOut))
      : details;

    return {
      success: true,
      slotsUsed: existingConflicts.length,
      inventory,
      expiresAt: existing.expiresAt,
      lock: existing,
    };
  }

  const conflicting = checkIn && checkOut
    ? details.filter((detail) => detail.checkIn && detail.checkOut && datesOverlap(checkIn, checkOut, detail.checkIn, detail.checkOut))
    : details;

  if (conflicting.length >= inventory) {
    return { success: false, slotsUsed: conflicting.length, inventory, expiresAt };
  }

  const lock: RoomLock = {
    roomId,
    sessionId,
    lockedAt: new Date().toISOString(),
    expiresAt,
    guestName,
    checkIn,
    checkOut,
  };

  await redis.zadd(SLOT_KEY(roomId), new Date(expiresAt).getTime(), sessionId);
  await redis.set(DETAIL_KEY(roomId, sessionId), JSON.stringify(lock), 'EX', LOCK_TTL);

  return { success: true, slotsUsed: conflicting.length + 1, inventory, expiresAt, lock };
}

export async function releaseSlot(roomId: string, sessionId: string): Promise<boolean> {
  const redis = await getOperationalRedis();
  await redis.zrem(SLOT_KEY(roomId), sessionId);
  await redis.del(DETAIL_KEY(roomId, sessionId));
  return true;
}

export async function confirmSlot(roomId: string, sessionId: string): Promise<string> {
  const bookingReference = makeReference();
  const redis = await getOperationalRedis();
  const raw = await redis.get(DETAIL_KEY(roomId, sessionId));

  if (!raw) {
    throw new Error('Reservation expired or missing');
  }

  const detail: RoomLock = JSON.parse(raw);
  if (detail.sessionId !== sessionId) {
    throw new Error('Session mismatch - reservation belongs to another guest');
  }

  await redis.set(CONFIRM_KEY(roomId, sessionId), JSON.stringify({ bookingReference, confirmedAt: new Date().toISOString() }));
  await redis.zrem(SLOT_KEY(roomId), sessionId);
  await redis.del(DETAIL_KEY(roomId, sessionId));

  return bookingReference;
}

export async function getSlotStatus(
  roomId: string,
  checkIn?: string,
  checkOut?: string,
  inventory = 5,
): Promise<LockStatusResponse> {
  const { redis, members } = await sweepAndGetMembers(roomId);

  if (members.length === 0) {
    return { status: 'available', slotsAvailable: inventory, slotsTotal: inventory };
  }

  const detailKeys = members.map((sid) => DETAIL_KEY(roomId, sid));
  const raws: (string | null)[] = await redis.mget(detailKeys);
  const details: RoomLock[] = raws.flatMap((raw) => raw ? [JSON.parse(raw) as RoomLock] : []);

  const conflicting = checkIn && checkOut
    ? details.filter((detail) => detail.checkIn && detail.checkOut && datesOverlap(checkIn, checkOut, detail.checkIn, detail.checkOut))
    : details;

  const slotsUsed = conflicting.length;
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
}

export async function isSessionSlotActive(roomId: string, sessionId: string): Promise<boolean> {
  const redis = await getOperationalRedis();
  const raw = await redis.get(DETAIL_KEY(roomId, sessionId));
  return raw !== null;
}

export const acquireRoomLock = (
  roomId: string, sessionId: string, checkIn?: string, checkOut?: string, guestName?: string,
) => reserveSlot(roomId, sessionId, 5, checkIn, checkOut, guestName)
  .then((result) => ({
    success: result.success,
    lock: result.lock ?? { roomId, sessionId, lockedAt: new Date().toISOString(), expiresAt: result.expiresAt },
    expiresAt: result.expiresAt,
  }));

export const releaseRoomLock       = releaseSlot;
export const confirmRoomLock       = confirmSlot;
export const getRoomLockStatus     = (roomId: string, checkIn?: string, checkOut?: string, inventory?: number) =>
  getSlotStatus(roomId, checkIn, checkOut, inventory);
export const isRoomLockedBySession = isSessionSlotActive;
