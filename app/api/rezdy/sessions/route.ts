import { NextRequest, NextResponse } from 'next/server';
import { getRezdySessions } from '@/lib/rezdy/service';
import { MOCK_SESSIONS } from '@/data/mockData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productCode = searchParams.get('productCode') ?? '';
  const startTime = searchParams.get('startTime') ?? new Date().toISOString();
  const endTime =
    searchParams.get('endTime') ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (!productCode) {
    return NextResponse.json({ error: 'productCode is required' }, { status: 400 });
  }

  try {
    const sessions = await getRezdySessions(productCode, startTime, endTime);
    const withCode = sessions.map((s) => ({ ...s, productCode }));
    return NextResponse.json({ sessions: withCode, source: 'rezdy' });
  } catch {
    const withCode = MOCK_SESSIONS.map((s) => ({ ...s, productCode }));
    return NextResponse.json({ sessions: withCode, source: 'mock' });
  }
}
