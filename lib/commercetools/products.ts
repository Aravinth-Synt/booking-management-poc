import { ctRequest } from './auth';
import type {
  CTProductProjection,
  CTProductProjectionPagedQueryResponse,
  CTVariant,
  CTAttribute,
  LocalizedString,
  RoomProduct,
  RoomCategory,
  RoomAmenity,
} from '@/types';

const ROOM_PRODUCT_TYPE_ID = process.env.CT_PRODUCT_TYPE_ID ?? '';

function getLocalizedValue(obj: LocalizedString | undefined): string {
  if (!obj) return '';
  return obj.en ?? Object.values(obj)[0] ?? '';
}

function getAttrString(variant: CTVariant, name: string): string {
  const attr = variant.attributes?.find((a: CTAttribute) => a.name === name);
  if (!attr) return '';
  const v = attr.value;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && 'en' in v) return (v as LocalizedString).en;
  return String(v);
}

function getAttrNumber(variant: CTVariant, name: string): number {
  const attr = variant.attributes?.find((a: CTAttribute) => a.name === name);
  if (!attr) return 0;
  return Number(attr.value);
}

export function ctProjectionToRoom(p: CTProductProjection): RoomProduct {
  const v = p.masterVariant;
  const centAmount = v.prices?.[0]?.value?.centAmount ?? 0;
  const fractionDigits = v.prices?.[0]?.value?.fractionDigits ?? 2;
  const pricePerNight = centAmount / Math.pow(10, fractionDigits);
  const amenitiesRaw = getAttrString(v, 'room-amenities');

  return {
    id: p.id,
    ctKey: p.key ?? '',
    name: getLocalizedValue(p.name),
    description: getLocalizedValue(p.description),
    category: (getAttrString(v, 'room-category') as RoomCategory) || 'MODERATE',
    amenity: (getAttrString(v, 'room-amenity') as RoomAmenity) || 'AC',
    floor: getAttrNumber(v, 'room-floor'),
    roomNumber: getAttrString(v, 'room-number'),
    pricePerNight,
    maxGuests: getAttrNumber(v, 'room-max-guests') || 2,
    images: v.images?.map((img) => img.url) ?? [],
    amenities: amenitiesRaw ? amenitiesRaw.split(',').map((s) => s.trim()) : [],
    status: 'available',
    lockStatus: 'available',
  };
}

export async function getRooms(limit = 20, offset = 0): Promise<RoomProduct[]> {
  const whereClause = ROOM_PRODUCT_TYPE_ID
    ? `&where=productType(id%3D%22${ROOM_PRODUCT_TYPE_ID}%22)`
    : '';
  const data = await ctRequest<CTProductProjectionPagedQueryResponse>(
    `/product-projections?limit=${limit}&offset=${offset}&staged=false${whereClause}`
  );
  return (data.results ?? []).map(ctProjectionToRoom);
}

export async function getRoomById(id: string): Promise<RoomProduct> {
  const data = await ctRequest<CTProductProjection>(`/product-projections/${id}?staged=false`);
  return ctProjectionToRoom(data);
}
