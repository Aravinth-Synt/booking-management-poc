import { NextResponse } from 'next/server';
import { getRooms } from '@/lib/commercetools/products';
import { getRoomLockStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { RoomProduct } from '@/types';

export async function GET() {
  let rooms: RoomProduct[];
  let source: 'ct' | 'mock' = 'ct';

  try {
    rooms = await getRooms();
    if (rooms.length === 0) { rooms = MOCK_ROOMS; source = 'mock'; }
  } catch {
    rooms = MOCK_ROOMS;
    source = 'mock';
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

  return NextResponse.json({ rooms: visibleRooms, source });
}
