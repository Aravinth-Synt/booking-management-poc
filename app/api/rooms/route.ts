import { NextRequest, NextResponse } from 'next/server';
import { getRooms, searchRooms } from '@/lib/commercetools/products';
import { getSlotStatus } from '@/lib/redis/roomLock';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { RoomProduct } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q        = searchParams.get('q')?.trim() ?? '';
  const limit    = Number(searchParams.get('limit')  ?? '20');
  const offset   = Number(searchParams.get('offset') ?? '0');
  const checkIn  = searchParams.get('checkIn')  ?? undefined;
  const checkOut = searchParams.get('checkOut') ?? undefined;

  let rooms: RoomProduct[];
  let source: 'ct' | 'mock' = 'ct';
  let error: string | null = null;

  try {
    rooms = q ? await searchRooms(q, limit, offset) : await getRooms(limit, offset);
    if (!q && rooms.length === 0) {
      rooms  = MOCK_ROOMS;
      source = 'mock';
      error  = 'No commercetools rooms were found. Check your accommodation product type configuration and room variant attributes.';
    }
  } catch (err: unknown) {
    rooms  = MOCK_ROOMS;
    source = 'mock';
    error  = err instanceof Error ? err.message : 'Failed to load commercetools rooms.';
  }

  const withSlots = await Promise.all(
    rooms.map(async (room) => {
      try {
        const inventory  = room.inventory ?? 5;
        const slotStatus = await getSlotStatus(room.id, checkIn, checkOut, inventory);
        return {
          ...room,
          lockStatus:      slotStatus.status,
          lockedUntil:     slotStatus.lock?.expiresAt,
          lockedBySession: slotStatus.lock?.sessionId,
          dateConflict:    slotStatus.dateConflict,
          slotsAvailable:  slotStatus.slotsAvailable,
          slotsTotal:      slotStatus.slotsTotal,
        } as RoomProduct;
      } catch {
        return room;
      }
    }),
  );

  return NextResponse.json({ rooms: withSlots, source, error, query: q, limit, offset, total: withSlots.length });
}
