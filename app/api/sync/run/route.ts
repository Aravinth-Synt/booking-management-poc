import { NextResponse } from 'next/server';
import { runFullSync } from '@/lib/sync/syncService';

export async function POST() {
  try {
    const report = await runFullSync();
    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/sync/run to trigger a full Rezdy → commercetools product sync.',
    description:
      'Fetches all Rezdy products and upserts them into commercetools. Returns a FullSyncReport.',
  });
}
