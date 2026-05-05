import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/commercetools/products';
import { getSlotStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { LockStatusResponse } from '@/types';

async function getSlotStatusSafe(
  roomId: string,
  checkIn?: string,
  checkOut?: string,
  inventory = 5,
): Promise<LockStatusResponse> {
  try {
    return await getSlotStatus(roomId, checkIn, checkOut, inventory);
  } catch {
    return {
      status: 'available',
      slotsAvailable: inventory,
      slotsTotal: inventory,
    };
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const checkIn  = searchParams.get('checkIn')  ?? undefined;
  const checkOut = searchParams.get('checkOut') ?? undefined;

  let room;
  try {
    room = await getRoomById(id);
  } catch {
    room = MOCK_ROOMS.find((r) => r.id === id) ?? MOCK_ROOMS[0];
  }

  const inventory  = room.inventory ?? 5;
  const slotStatus = await getSlotStatusSafe(id, checkIn, checkOut, inventory);
  return NextResponse.json({
    ...room,
    lockStatus:      slotStatus.status,
    lockedUntil:     slotStatus.lock?.expiresAt,
    lockedBySession: slotStatus.lock?.sessionId,
    secondsRemaining: slotStatus.secondsRemaining,
    slotsAvailable:  slotStatus.slotsAvailable,
    slotsTotal:      slotStatus.slotsTotal,
  });
}
