import { NextRequest, NextResponse } from 'next/server';
import { createRezdyBooking } from '@/lib/rezdy/service';
import type { RezdyBookingRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RezdyBookingRequest;

    if (!body.customer?.email || !body.customer?.firstName || !body.customer?.lastName) {
      return NextResponse.json({ error: 'customer firstName, lastName, and email are required' }, { status: 400 });
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'at least one booking item is required' }, { status: 400 });
    }

    const response = await createRezdyBooking(body);

    if (!response.requestStatus?.success) {
      return NextResponse.json(
        { error: response.requestStatus?.error?.errorMessage ?? 'Booking failed' },
        { status: 422 }
      );
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
