import { NextRequest, NextResponse } from 'next/server';
import { isSessionSlotActive } from '@/lib/redis/roomLock';
import { createBooking } from '@/lib/booking/bookingService';
import { getRoomById } from '@/lib/commercetools/products';
import { MOCK_ROOMS } from '@/data/mockRooms';
import type { BookingRequest } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BookingRequest;
    const { roomId, sessionId, checkIn, checkOut, guestDetails } = body;

    if (!roomId || !sessionId || !checkIn || !checkOut || !guestDetails?.email) {
      return NextResponse.json(
        { error: 'roomId, sessionId, checkIn, checkOut, and guestDetails.email are required' },
        { status: 400 },
      );
    }

    const slotActive = await isSessionSlotActive(roomId, sessionId);
    if (!slotActive) {
      return NextResponse.json(
        { error: 'Reservation expired or belongs to another session' },
        { status: 409 },
      );
    }

    let roomName = 'Room';
    try {
      const room = await getRoomById(roomId);
      roomName = room.name;
    } catch {
      roomName = MOCK_ROOMS.find((r) => r.id === roomId)?.name ?? 'Room';
    }

    const confirmation = await createBooking(body, roomName);
    return NextResponse.json({ confirmation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
