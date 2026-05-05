import { NextRequest, NextResponse } from 'next/server';
import { releaseSlot } from '@/lib/redis/roomLock';

function statusForError(message: string): number {
  return message.includes('Redis') ? 503 : 500;
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, sessionId } = await req.json() as { roomId?: string; sessionId?: string };
    if (!roomId || !sessionId) {
      return NextResponse.json({ error: 'roomId and sessionId are required' }, { status: 400 });
    }

    await releaseSlot(roomId, sessionId);
    return NextResponse.json({ released: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
