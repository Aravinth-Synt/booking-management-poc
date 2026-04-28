import type {
  RezdyProduct,
  RezdySession,
  RezdyBookingRequest,
  RezdyBookingResponse,
  TourProduct,
} from '@/types';

interface RezdyConfig {
  apiKey: string;
  baseUrl: string;
}

function getRezdyConfig(): RezdyConfig {
  const apiKey = process.env.REZDY_API_KEY ?? '';
  const baseUrl = process.env.REZDY_BASE_URL ?? 'https://api.rezdy.com/v1';
  return { apiKey, baseUrl };
}

async function rezdyRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { apiKey, baseUrl } = getRezdyConfig();
  const url = `${baseUrl}${path}${path.includes('?') ? '&' : '?'}apiKey=${apiKey}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Rezdy API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function getRezdyProducts(limit = 100, offset = 0): Promise<RezdyProduct[]> {
  const data = await rezdyRequest<{ requestStatus: { success: boolean }; products: RezdyProduct[] }>(
    `/products?limit=${limit}&offset=${offset}`
  );
  return data.products ?? [];
}

export async function getRezdyProduct(productCode: string): Promise<RezdyProduct> {
  const data = await rezdyRequest<{ requestStatus: { success: boolean }; product: RezdyProduct }>(
    `/products/${productCode}`
  );
  return data.product;
}

export async function getRezdySessions(
  productCode: string,
  startTime: string,
  endTime: string
): Promise<RezdySession[]> {
  const data = await rezdyRequest<{ requestStatus: { success: boolean }; sessions: RezdySession[] }>(
    `/availability?productCode=${productCode}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
  );
  return data.sessions ?? [];
}

export async function createRezdyBooking(booking: RezdyBookingRequest): Promise<RezdyBookingResponse> {
  return rezdyRequest<RezdyBookingResponse>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ booking }),
  });
}

export async function getRezdyBooking(orderNumber: string): Promise<RezdyBookingResponse> {
  return rezdyRequest<RezdyBookingResponse>(`/bookings/${orderNumber}`);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getRezdyImageUrl(product: RezdyProduct): string {
  const img = product.images?.[0];
  if (!img) return 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80';
  return img.largeSizeUrl || img.mediumSizeUrl || img.itemUrl;
}

export function formatRezdyLocation(product: RezdyProduct): string {
  const addr = product.locationAddress;
  if (!addr) return product.supplier?.name ?? 'Australia';
  const parts = [addr.city, addr.state].filter(Boolean);
  return parts.join(', ') || addr.countryCode || 'Australia';
}

export function formatDuration(minutes: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function rezdyToTourProduct(product: RezdyProduct, ctId?: string): TourProduct {
  const price = product.advertisedPrice ?? product.priceOptions?.[0]?.price ?? 0;
  return {
    id: product.productCode,
    ctId,
    name: product.name,
    shortDescription: product.shortDescription ?? product.description?.slice(0, 120) ?? '',
    description: product.description ?? '',
    imageUrl: getRezdyImageUrl(product),
    price,
    currency: product.currency ?? 'AUD',
    durationMinutes: product.durationMinutes ?? 0,
    location: formatRezdyLocation(product),
    tags: product.tags ?? [],
    productType: product.productType ?? 'TOUR',
    rezdyCode: product.productCode,
    syncStatus: ctId ? 'synced' : 'pending',
  };
}
