import { NextRequest, NextResponse } from 'next/server';
import { getRooms, searchRooms } from '@/lib/commercetools/products';
import { getRoomLockStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { RoomProduct } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');
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
        const lockStatus = await getRoomLockStatus(room.id);
        return {
          ...room,
          lockStatus: lockStatus.status === 'locked' ? 'locked' : 'available',
          lockedUntil: lockStatus.lock?.expiresAt,
          lockedBySession: lockStatus.lock?.sessionId,
        } as RoomProduct;
      } catch {
        return room;
      }
    })
  );

  // Hide rooms that are currently locked (in another user's checkout)
  const visibleRooms = withLocks.filter((r) => r.lockStatus !== 'locked');

  return NextResponse.json({ rooms: visibleRooms, source, error, query: q, limit, offset, total: visibleRooms.length });
}
