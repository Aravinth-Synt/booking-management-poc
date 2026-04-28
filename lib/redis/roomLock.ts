import getRedisClient from './client';
import type { RoomLock, LockStatusResponse } from '@/types';

const LOCK_TTL = 600; // 10 minutes
const LOCK_KEY = (roomId: string) => `room:lock:${roomId}`;
const CONFIRMED_KEY = (roomId: string) => `room:confirmed:${roomId}`;

function makeLock(roomId: string, sessionId: string, checkIn?: string, checkOut?: string, guestName?: string): RoomLock {
  return {
    roomId,
    sessionId,
    lockedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LOCK_TTL * 1000).toISOString(),
    guestName,
    checkIn,
    checkOut,
  };
}

function makeReference(): string {
  return `LSY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

export async function acquireRoomLock(
  roomId: string,
  sessionId: string,
  checkIn?: string,
  checkOut?: string,
  guestName?: string
): Promise<{ success: boolean; lock: RoomLock; expiresAt: string }> {
  const lock = makeLock(roomId, sessionId, checkIn, checkOut, guestName);

  try {
    const redis = getRedisClient();
    const key   = LOCK_KEY(roomId);
    const result = await redis.set(key, JSON.stringify(lock), 'EX', LOCK_TTL, 'NX');

    if (result === 'OK') {
      return { success: true, lock, expiresAt: lock.expiresAt };
    }

    // Lock already held — return existing
    const existing = await redis.get(key);
    const existingLock: RoomLock = existing ? JSON.parse(existing) : lock;
    return { success: false, lock: existingLock, expiresAt: existingLock.expiresAt };
  } catch {
    // Redis unavailable — allow booking to proceed without distributed lock
    return { success: true, lock, expiresAt: lock.expiresAt };
  }
}

export async function releaseRoomLock(roomId: string, sessionId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key   = LOCK_KEY(roomId);
    const raw   = await redis.get(key);

    if (!raw) return true; // idempotent

    const lock: RoomLock = JSON.parse(raw);
    if (lock.sessionId !== sessionId) throw new Error('Not your lock');

    await redis.del(key);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not your lock') throw err; // re-throw auth error
    return true; // Redis unavailable — treat as released
  }
}

export async function getRoomLockStatus(roomId: string): Promise<LockStatusResponse> {
  try {
    const redis = getRedisClient();
    const raw   = await redis.get(LOCK_KEY(roomId));

    if (!raw) return { status: 'available' };

    const lock: RoomLock = JSON.parse(raw);
    const secondsRemaining = Math.max(0, Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000));

    return { status: 'locked', lock, secondsRemaining };
  } catch {
    return { status: 'available' }; // Redis unavailable — treat as available
  }
}

export async function confirmRoomLock(roomId: string, sessionId: string): Promise<string> {
  const bookingReference = makeReference();

  try {
    const redis = getRedisClient();
    const key   = LOCK_KEY(roomId);
    const raw   = await redis.get(key);

    if (raw) {
      const lock: RoomLock = JSON.parse(raw);
      if (lock.sessionId !== sessionId) throw new Error('Session mismatch — reservation belongs to another guest');
    }
    // If no lock key found (Redis just came back up), proceed — lock may have expired

    await redis.set(CONFIRMED_KEY(roomId), JSON.stringify({ bookingReference, confirmedAt: new Date().toISOString() }));
    await redis.del(key);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('Session mismatch')) throw err; // re-throw auth error
    // Redis unavailable — still return a reference so the booking can complete
  }

  return bookingReference;
}

export async function getLockRemainingTTL(roomId: string): Promise<number> {
  try {
    return await getRedisClient().ttl(LOCK_KEY(roomId));
  } catch {
    return -1;
  }
}

export async function isRoomLockedBySession(roomId: string, sessionId: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const raw   = await redis.get(LOCK_KEY(roomId));
    if (!raw) return false;
    const lock: RoomLock = JSON.parse(raw);
    return lock.sessionId === sessionId;
  } catch {
    // Redis unavailable — assume session holds the lock so checkout can complete
    return true;
  }
}
