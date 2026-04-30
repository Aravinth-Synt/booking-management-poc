import { NextRequest, NextResponse } from 'next/server';
import { getRooms, searchRooms } from '@/lib/commercetools/products';
import { getRoomLockStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { RoomProduct } from '@/types';
import { isEffectivelyLocked } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q        = searchParams.get('q')?.trim() ?? '';
  const limit    = Number(searchParams.get('limit') ?? '20');
  const offset   = Number(searchParams.get('offset') ?? '0');
  const checkIn  = searchParams.get('checkIn')  ?? undefined;
  const checkOut = searchParams.get('checkOut') ?? undefined;
  let rooms: RoomProduct[];
  let source: 'ct' | 'mock' = 'ct';
  let error: string | null = null;

  try {
    rooms = q ? await searchRooms(q, limit, offset) : await getRooms(limit, offset);
    if (!q && rooms.length === 0) {
      rooms = MOCK_ROOMS;
      source = 'mock';
      error = 'No commercetools rooms were found. Check your accommodation product type configuration and room variant attributes.';
    }
  } catch (err: unknown) {
    rooms = MOCK_ROOMS;
    source = 'mock';
    error = err instanceof Error ? err.message : 'Failed to load commercetools rooms.';
  }

  const withLocks = await Promise.all(
    rooms.map(async (room) => {
      try {
        const lockStatus = await getRoomLockStatus(room.id, checkIn, checkOut);
        const effectiveLock = lockStatus.status === 'locked' && isEffectivelyLocked(lockStatus.dateConflict);
        return {
          ...room,
          lockStatus: effectiveLock ? 'locked' : 'available',
          lockedUntil: lockStatus.lock?.expiresAt,
          lockedBySession: lockStatus.lock?.sessionId,
          dateConflict: lockStatus.dateConflict,
        } as RoomProduct;
      } catch {
        return room;
      }
    })
  );

  return NextResponse.json({ rooms: withLocks, source, error, query: q, limit, offset, total: withLocks.length });
}
