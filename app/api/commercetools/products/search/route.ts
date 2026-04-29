import { NextRequest, NextResponse } from 'next/server';
import { searchCTProducts } from '@/lib/commercetools/products';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  try {
    const products = await searchCTProducts(q, limit, offset);
    return NextResponse.json({
      products,
      total: products.length,
      limit,
      offset,
      query: q,
      source: 'ct',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
