import { NextRequest, NextResponse } from 'next/server';
import { getCTProducts, searchCTProducts } from '@/lib/commercetools/products';
import type { TourProduct } from '@/types';
import type { Event, EventCategory } from '@/types/events';

function inferCategory(product: TourProduct): EventCategory {
  const values = [product.productType, product.location, ...product.tags].join(' ').toLowerCase();

  if (values.includes('music') || values.includes('concert')) return 'Music';
  if (values.includes('sport') || values.includes('stadium')) return 'Sports';
  return 'Culture';
}

function productToEvent(product: TourProduct): Event {
  return {
    id: product.rezdyCode,
    name: product.name,
    description: product.shortDescription || product.description,
    date: product.durationMinutes > 0 ? `${product.durationMinutes} min experience` : 'Available now',
    category: inferCategory(product),
    image: product.imageUrl,
    price: product.price > 0 ? `${product.currency} ${product.price}` : undefined,
    eventType: product.productType,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  try {
    const products = q ? await searchCTProducts(q, 50, 0) : await getCTProducts(50, 0);
    const events = products.map(productToEvent);

    return NextResponse.json({
      events,
      total: events.length,
      source: 'ct',
      query: q,
      error: events.length === 0 ? 'No commercetools catalogue products were found. Check CT_CATALOG_PRODUCT_TYPE_ID.' : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load commercetools products';
    return NextResponse.json({
      events: [],
      total: 0,
      source: 'ct',
      error: message,
    }, { status: 500 });
  }
}
