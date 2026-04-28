import { NextRequest, NextResponse } from 'next/server';
import { releaseRoomLock } from '@/lib/redis/roomLock';

export async function POST(req: NextRequest) {
  try {
    const { roomId, sessionId } = await req.json() as { roomId?: string; sessionId?: string };
    if (!roomId || !sessionId) {
      return NextResponse.json({ error: 'roomId and sessionId are required' }, { status: 400 });
    }

    await releaseRoomLock(roomId, sessionId);
    return NextResponse.json({ released: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message === 'Not your lock' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
