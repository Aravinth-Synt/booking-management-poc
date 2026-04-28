import { NextRequest, NextResponse } from 'next/server';
import { acquireRoomLock } from '@/lib/redis/roomLock';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      roomId?: string; sessionId?: string;
      checkIn?: string; checkOut?: string; guestName?: string;
    };

    const { roomId, sessionId, checkIn, checkOut, guestName } = body;
    if (!roomId || !sessionId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'roomId, sessionId, checkIn, and checkOut are required' }, { status: 400 });
    }

    const result = await acquireRoomLock(roomId, sessionId, checkIn, checkOut, guestName);

    if (!result.success) {
      const secondsRemaining = Math.max(
        0,
        Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: 'Room is reserved', lock: result.lock, secondsRemaining },
        { status: 409 }
      );
    }

    return NextResponse.json({ lock: result.lock, expiresAt: result.expiresAt, sessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
