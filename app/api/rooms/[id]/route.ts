import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/commercetools/products';
import { getRoomLockStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  let room;
  try {
    room = await getRoomById(id);
  } catch {
    room = MOCK_ROOMS.find((r) => r.id === id) ?? MOCK_ROOMS[0];
  }

  try {
    const lockStatus = await getRoomLockStatus(id);
    return NextResponse.json({
      ...room,
      lockStatus: lockStatus.status,
      lockedUntil: lockStatus.lock?.expiresAt,
      lockedBySession: lockStatus.lock?.sessionId,
      secondsRemaining: lockStatus.secondsRemaining,
    });
  } catch {
    return NextResponse.json(room);
  }
}
