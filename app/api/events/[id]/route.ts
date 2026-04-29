import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/lib/commercetools/products';
import type { TourProduct } from '@/types';
import type { Event, EventCategory } from '@/types/events';

function inferCategory(product: TourProduct): EventCategory {
  const values = [product.productType, product.location, ...product.tags].join(' ').toLowerCase();

  if (values.includes('music') || values.includes('concert')) return 'Music';
  if (values.includes('sport') || values.includes('stadium')) return 'Sports';
  return 'Culture';
}

function productToEvent(product: TourProduct): Event {
  const dateParts = [product.eventDate, product.eventTime].filter(Boolean);
  const displayDate = dateParts.length > 0 ? dateParts.join(' ') : (product.durationMinutes > 0 ? `${product.durationMinutes} min experience` : 'Available now');

  return {
    id: product.ctId ?? product.id,
    name: product.name,
    description: product.shortDescription || product.description,
    date: displayDate,
    category: inferCategory(product),
    image: product.imageUrl,
    price: product.price > 0 ? `${product.currency} ${product.price}` : undefined,
    eventType: product.productType,
    eventDate: product.eventDate,
    eventTime: product.eventTime,
    venueName: product.venueName,
    city: product.city,
    state: product.state,
    country: product.country,
    ticketUrl: product.ticketUrl,
    saleStart: product.saleStart,
    saleEnd: product.saleEnd,
    statusLabel: product.statusLabel,
    genre: product.genre,
    subGenre: product.subGenre,
    externalEventId: product.externalEventId,
  };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await getEventById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      event: productToEvent(product),
      source: 'ct',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load commercetools event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
