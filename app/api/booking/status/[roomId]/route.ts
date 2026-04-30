import { NextRequest, NextResponse } from 'next/server';
import { getRoomLockStatus } from '@/lib/redis/roomLock';

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const checkIn  = searchParams.get('checkIn')  ?? undefined;
    const checkOut = searchParams.get('checkOut') ?? undefined;
    const status = await getRoomLockStatus(params.roomId, checkIn, checkOut);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ status: 'available' });
  }
}
