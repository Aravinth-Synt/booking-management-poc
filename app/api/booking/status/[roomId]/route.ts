import { NextRequest, NextResponse } from 'next/server';
import { getSlotStatus } from '@/lib/redis/roomLock';

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const checkIn   = searchParams.get('checkIn')   ?? undefined;
    const checkOut  = searchParams.get('checkOut')  ?? undefined;
    const inventory = Number(searchParams.get('inventory') ?? '5');
    const status    = await getSlotStatus(params.roomId, checkIn, checkOut, inventory);
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: message.includes('Redis') ? 503 : 500 });
  }
}
