import { NextRequest, NextResponse } from 'next/server';
import { reserveSlot } from '@/lib/redis/roomLock';

function statusForError(message: string): number {
  return message.includes('Redis') ? 503 : 500;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      roomId?: string; sessionId?: string;
      checkIn?: string; checkOut?: string;
      guestName?: string; inventory?: number;
    };

    const { roomId, sessionId, checkIn, checkOut, guestName, inventory = 5 } = body;
    if (!roomId || !sessionId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'roomId, sessionId, checkIn, and checkOut are required' },
        { status: 400 },
      );
    }

    const result = await reserveSlot(roomId, sessionId, inventory, checkIn, checkOut, guestName);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Room is fully booked for the selected dates', slotsUsed: result.slotsUsed, inventory: result.inventory },
        { status: 409 },
      );
    }

    return NextResponse.json({
      lock: result.lock,
      expiresAt: result.expiresAt,
      sessionId,
      slotsUsed: result.slotsUsed,
      inventory: result.inventory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
