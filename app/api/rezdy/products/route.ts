import { NextResponse } from 'next/server';
import { getRezdyProducts, rezdyToTourProduct } from '@/lib/rezdy/service';
import { MOCK_TOURS } from '@/data/mockData';

export async function GET() {
  try {
    const rezdyProducts = await getRezdyProducts();
    const tours = rezdyProducts.map((p) => rezdyToTourProduct(p));
    return NextResponse.json({ tours, source: 'rezdy' });
  } catch {
    return NextResponse.json({ tours: MOCK_TOURS, source: 'mock' });
  }
}
