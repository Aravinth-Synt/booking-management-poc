import { NextRequest, NextResponse } from 'next/server';
import {
  getCTProducts,
  getCTTourProductByKey,
  searchCTProducts,
} from '@/lib/commercetools/products';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');
  const query = searchParams.get('q')?.trim() ?? '';
  const key = searchParams.get('key')?.trim() ?? '';

  try {
    if (key) {
      const product = await getCTTourProductByKey(key);

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({ product, source: 'ct' });
    }

    const products = query
      ? await searchCTProducts(query, limit, offset)
      : await getCTProducts(limit, offset);

    return NextResponse.json({
      products,
      total: products.length,
      limit,
      offset,
      query,
      source: 'ct',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
