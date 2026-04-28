import { NextRequest, NextResponse } from 'next/server';
import { getRoomLockStatus } from '@/lib/redis/roomLock';

export async function GET(_req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const status = await getRoomLockStatus(params.roomId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ status: 'available' });
  }
}
