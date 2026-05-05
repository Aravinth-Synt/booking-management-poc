import { ctRequest } from './auth';
import getRedisClient from '@/lib/redis/client';
import type {
  CTAttribute,
  CTProduct,
  CTProductData,
  CTProductPagedQueryResponse,
  CTProductProjection,
  CTProductProjectionPagedQueryResponse,
  CTVariant,
  LocalizedString,
  RoomAmenity,
  RoomCategory,
  RoomProduct,
  TourProduct,
} from '@/types';

const ROOM_PRODUCT_TYPE_ID = process.env.CT_ACCOMMODATION_PRODUCT_TYPE_ID ?? '';
const ROOM_PRODUCT_TYPE_KEY = process.env.CT_ACCOMMODATION_PRODUCT_TYPE_KEY ?? '';
const CATALOG_PRODUCT_TYPE_ID = process.env.CT_CATALOG_PRODUCT_TYPE_ID ?? '';
const CATALOG_PRODUCT_TYPE_KEY =
  process.env.CT_CATALOG_PRODUCT_TYPE_KEY ?? process.env.CT_PRODUCT_TYPE_KEY ?? '';
const PRODUCT_CACHE_TTL_SECONDS = 300;
const CT_LOCALE = process.env.CT_LOCALE ?? 'en-US';

interface CTProductType {
  id: string;
  key?: string;
}

interface CTProductTypePagedQueryResponse {
  results?: CTProductType[];
}

interface CTInventoryEntry {
  sku: string;
  quantityOnHand: number;
}

interface CTInventoryPagedQueryResponse {
  results: CTInventoryEntry[];
}

function getProductTypeWhereClause(productTypeId: string): string[] {
  return productTypeId ? [`productType(id="${productTypeId}")`] : [];
}

async function resolveProductTypeId(productTypeId: string, productTypeKey: string): Promise<string> {
  if (productTypeId) return productTypeId;
  if (!productTypeKey) return '';

  return withCache(`ct:product-type:key:${productTypeKey}`, async () => {
    const data = await ctRequest<CTProductTypePagedQueryResponse>(
      `/product-types?where=${encodeURIComponent(`key="${productTypeKey}"`)}&limit=1`
    );
    return data.results?.[0]?.id ?? '';
  });
}

function getLocalizedValue(obj: LocalizedString | undefined): string {
  if (!obj) return '';
  return obj[CT_LOCALE] ?? obj.en ?? obj['en-US'] ?? obj['en-GB'] ?? Object.values(obj)[0] ?? '';
}

function getAttrValue(variant: CTVariant, ...names: string[]): CTAttribute['value'] | undefined {
  for (const name of names) {
    const value = variant.attributes?.find((a) => a.name === name)?.value;
    if (value !== undefined) return value;
  }

  return undefined;
}

function getAttributeValue(attributes: CTAttribute[] | undefined, ...names: string[]): CTAttribute['value'] | undefined {
  for (const name of names) {
    const value = attributes?.find((a) => a.name === name)?.value;
    if (value !== undefined) return value;
  }

  return undefined;
}

function attrValueToString(value: CTAttribute['value'] | undefined): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((entry) => attrValueToString(entry))
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(', ');
  }
  if (value && typeof value === 'object') {
    if ('key' in value && typeof value.key === 'string' && value.key.trim()) return value.key;
    if ('label' in value && value.label && typeof value.label === 'object') {
      return getLocalizedValue(value.label as LocalizedString);
    }
    if ('en' in value && typeof value.en === 'string') return value.en;
    if ('en-US' in value && typeof value['en-US'] === 'string') return value['en-US'];
    if ('en-GB' in value && typeof value['en-GB'] === 'string') return value['en-GB'];
  }
  return '';
}

function getAttrString(variant: CTVariant, ...names: string[]): string {
  return attrValueToString(getAttrValue(variant, ...names));
}

function getAttributeString(attributes: CTAttribute[] | undefined, ...names: string[]): string {
  return attrValueToString(getAttributeValue(attributes, ...names));
}

function getAttrNumber(variant: CTVariant, ...names: string[]): number {
  const value = getAttrValue(variant, ...names);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function getAttrStringList(variant: CTVariant, ...names: string[]): string[] {
  const value = getAttrValue(variant, ...names);

  if (Array.isArray(value)) {
    return value
      .map((entry) => attrValueToString(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function getAttributeStringList(attributes: CTAttribute[] | undefined, ...names: string[]): string[] {
  const value = getAttributeValue(attributes, ...names);

  if (Array.isArray(value)) {
    return value
      .map((entry) => attrValueToString(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeEnumLabel(value: string): string {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function mapRoomCategory(value: string): RoomCategory {
  const normalized = normalizeEnumLabel(value);

  if (normalized === 'LUXURY' || normalized === 'MODERATE' || normalized === 'BUDGET') {
    return normalized;
  }

  if (normalized.includes('LUXURY') || normalized.includes('DELUXE') || normalized.includes('PENTHOUSE')) {
    return 'LUXURY';
  }

  if (normalized.includes('BUDGET') || normalized.includes('STANDARD') || normalized.includes('ECONOMY')) {
    return 'BUDGET';
  }

  if (normalized.includes('MODERATE') || normalized.includes('SUPERIOR') || normalized.includes('CLASSIC')) {
    return 'MODERATE';
  }

  return 'MODERATE';
}

function mapRoomAmenity(value: string): RoomAmenity {
  const normalized = normalizeEnumLabel(value);

  if (normalized === 'AC' || normalized === 'NON_AC') {
    return normalized;
  }

  if (
    normalized.includes('NON_AC') ||
    normalized.includes('NONAC') ||
    normalized.includes('NATURAL_VENTILATION') ||
    normalized.includes('FAN')
  ) {
    return 'NON_AC';
  }

  if (
    normalized.includes('AIR_CONDITIONED') ||
    normalized.includes('AIR_CONDITIONING') ||
    normalized === 'AC'
  ) {
    return 'AC';
  }

  return 'AC';
}

function getTags(variant: CTVariant): string[] {
  const raw = getAttrString(variant, 'rezdy-tags');
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tokenizeSearch(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesSearchTokens(haystackValues: string[], query: string): boolean {
  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return true;

  const haystack = haystackValues.join(' ').toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function buildProductProjectionPath(params: {
  limit?: number;
  offset?: number;
  where?: string[];
  text?: string;
}): string {
  const search = new URLSearchParams();
  search.set('limit', String(params.limit ?? 20));
  search.set('offset', String(params.offset ?? 0));
  search.set('staged', 'false');

  for (const whereClause of params.where ?? []) {
    search.append('where', whereClause);
  }

  if (params.text) {
    search.set(`text.${CT_LOCALE}`, params.text);
    search.set('fuzzy', 'true');
    search.set('fuzzyLevel', '1');
  }

  return `/product-projections?${search.toString()}`;
}

function buildProductsPath(params: {
  limit?: number;
  offset?: number;
  where?: string[];
}): string {
  const search = new URLSearchParams();
  search.set('limit', String(params.limit ?? 20));
  search.set('offset', String(params.offset ?? 0));

  for (const whereClause of params.where ?? []) {
    search.append('where', whereClause);
  }

  return `/products?${search.toString()}`;
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', PRODUCT_CACHE_TTL_SECONDS);
  } catch {
    // Ignore Redis failures so catalogue requests can still succeed.
  }
}

async function withCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = await readCache<T>(key);
  if (cached !== null) return cached;
  const value = await loader();
  await writeCache(key, value);
  return value;
}

// Fetches quantityOnHand from CT's Inventory API for a batch of SKUs.
// Returns a map of SKU → quantityOnHand; silently returns empty map on failure.
async function fetchInventoryMap(skus: string[]): Promise<Map<string, number>> {
  if (skus.length === 0) return new Map();
  const where = `sku in (${skus.map((s) => `"${s}"`).join(',')})`;
  try {
    const data = await ctRequest<CTInventoryPagedQueryResponse>(
      `/inventory?where=${encodeURIComponent(where)}&limit=${skus.length}`,
    );
    return new Map(data.results.map((e) => [e.sku, e.quantityOnHand]));
  } catch {
    return new Map();
  }
}

function applyInventory(rooms: RoomProduct[], projections: CTProductProjection[], inventoryMap: Map<string, number>): RoomProduct[] {
  return rooms.map((room, i) => {
    const sku = projections[i]?.masterVariant?.sku;
    const qty = sku ? inventoryMap.get(sku) : undefined;
    return qty !== undefined ? { ...room, inventory: qty } : room;
  });
}

export function ctProjectionToRoom(p: CTProductProjection): RoomProduct {
  const v = p.masterVariant;
  const centAmount = v.prices?.[0]?.value?.centAmount ?? 0;
  const fractionDigits = v.prices?.[0]?.value?.fractionDigits ?? 2;
  const pricePerNight = centAmount / Math.pow(10, fractionDigits);
  const rawCategory = getAttrString(v, 'room-category', 'roomCategory', 'category');
  const rawAmenity = getAttrString(v, 'room-amenity', 'roomAmenity', 'air-conditioning', 'airConditioning');
  const amenities = getAttrStringList(v, 'room-amenities', 'roomAmenities', 'amenities');
  const category = mapRoomCategory(rawCategory);
  const amenity = mapRoomAmenity(rawAmenity);
  const roomNumber = getAttrString(v, 'room-number', 'roomNumber', 'room-no', 'roomNo') || v.sku || p.key || p.id;
  const floor      = getAttrNumber(v, 'room-floor', 'roomFloor', 'floor');
  const maxGuests  = getAttrNumber(v, 'room-max-guests', 'roomMaxGuests', 'max-guests', 'maxGuests') || 2;
  const inventory  = getAttrNumber(v, 'room-inventory', 'roomInventory', 'inventory') || 2;
  const amenityBadges    = amenity === 'AC' ? ['AC'] : ['Natural Ventilation'];
  const mergedAmenities  = Array.from(new Set([...amenityBadges, ...amenities]));

  return {
    id: p.id,
    ctKey: p.key ?? '',
    name: getLocalizedValue(p.name),
    description: getLocalizedValue(p.description),
    category,
    amenity,
    floor,
    roomNumber,
    pricePerNight,
    maxGuests,
    inventory,
    images: v.images?.map((img) => img.url) ?? [],
    amenities: mergedAmenities,
    status: 'available',
    lockStatus: 'available',
  };
}

export function ctProjectionToTourProduct(p: CTProductProjection): TourProduct {
  return ctProductDataToTourProduct({
    id: p.id,
    key: p.key,
    data: {
      name: p.name,
      description: p.description,
      slug: p.slug,
      masterVariant: p.masterVariant,
      variants: p.variants,
      attributes: [],
    },
  });
}

function ctProductDataToTourProduct(params: {
  id: string;
  key?: string;
  data: CTProductData;
}): TourProduct {
  const { id, key, data } = params;
  const v = data.masterVariant;
  const productAttributes = data.attributes ?? [];
  const centAmount = v.prices?.[0]?.value?.centAmount ?? 0;
  const fractionDigits = v.prices?.[0]?.value?.fractionDigits ?? 2;
  const price = centAmount / Math.pow(10, fractionDigits);
  const description = getLocalizedValue(data.description);
  const rezdyCode =
    getAttributeString(productAttributes, 'eventId') ||
    getAttrString(v, 'rezdy-product-code') ||
    v.sku ||
    key ||
    id;
  const venueName = getAttributeString(productAttributes, 'venueName');
  const city = getAttributeString(productAttributes, 'city');
  const state = getAttributeString(productAttributes, 'state');
  const country = getAttributeString(productAttributes, 'country');
  const segment = getAttributeString(productAttributes, 'segment');
  const genre = getAttributeString(productAttributes, 'genre');
  const subGenre = getAttributeString(productAttributes, 'subGenre');
  const productType = segment || genre || subGenre || getAttrString(v, 'product-type') || 'EVENT';
  const location = [venueName, city, state].filter(Boolean).join(', ');
  const tags = Array.from(
    new Set([
      ...getTags(v),
      ...getAttributeStringList(productAttributes, 'tags'),
      segment,
      genre,
      subGenre,
      city,
      state,
      country,
    ].filter(Boolean))
  );

  const imageUrls = v.images?.map((img) => img.url).filter(Boolean) ?? [];

  return {
    id,
    ctId: id,
    ctKey: key ?? rezdyCode,
    name: getLocalizedValue(data.name),
    shortDescription: description.slice(0, 140),
    description,
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    price,
    currency: v.prices?.[0]?.value?.currencyCode ?? 'AUD',
    durationMinutes: getAttrNumber(v, 'rezdy-duration'),
    location,
    tags,
    productType,
    rezdyCode,
    eventDate: getAttributeString(productAttributes, 'eventDate'),
    eventTime: getAttributeString(productAttributes, 'eventTime'),
    venueName,
    city,
    state,
    country,
    ticketUrl: getAttributeString(productAttributes, 'url'),
    saleStart: getAttributeString(productAttributes, 'saleStart'),
    saleEnd: getAttributeString(productAttributes, 'saleEnd'),
    statusLabel: getAttributeString(productAttributes, 'status'),
    genre,
    subGenre,
    externalEventId: getAttributeString(productAttributes, 'eventId'),
    syncStatus: 'synced',
  };
}

function ctProductToTourProduct(product: CTProduct): TourProduct {
  return ctProductDataToTourProduct({
    id: product.id,
    key: product.key,
    data: product.masterData.current,
  });
}

export async function getCTProducts(limit = 20, offset = 0): Promise<TourProduct[]> {
  const cacheScope = CATALOG_PRODUCT_TYPE_ID || CATALOG_PRODUCT_TYPE_KEY || 'all';
  return withCache(`ct:products:list:${limit}:${offset}:${cacheScope}`, async () => {
    const productTypeId = await resolveProductTypeId(CATALOG_PRODUCT_TYPE_ID, CATALOG_PRODUCT_TYPE_KEY);
    const where = getProductTypeWhereClause(productTypeId);
    const data = await ctRequest<CTProductPagedQueryResponse>(
      buildProductsPath({ limit, offset, where })
    );
    return (data.results ?? []).map(ctProductToTourProduct);
  });
}

export async function searchCTProducts(query: string, limit = 20, offset = 0): Promise<TourProduct[]> {
  const trimmed = query.trim();
  const cacheScope = CATALOG_PRODUCT_TYPE_ID || CATALOG_PRODUCT_TYPE_KEY || 'all';
  return withCache(`ct:products:search:${trimmed}:${limit}:${offset}:${cacheScope}`, async () => {
    const productTypeId = await resolveProductTypeId(CATALOG_PRODUCT_TYPE_ID, CATALOG_PRODUCT_TYPE_KEY);
    const where = getProductTypeWhereClause(productTypeId);
    const data = await ctRequest<CTProductPagedQueryResponse>(
      buildProductsPath({ limit: 200, offset: 0, where })
    );

    const products = (data.results ?? []).map(ctProductToTourProduct);
    if (!trimmed) return products.slice(offset, offset + limit);

    return products
      .filter((product) => {
        return matchesSearchTokens([
          product.name,
          product.shortDescription,
          product.description,
          product.location,
          product.rezdyCode,
          product.venueName ?? '',
          product.city ?? '',
          product.state ?? '',
          product.genre ?? '',
          product.subGenre ?? '',
          product.eventDate ?? '',
          product.eventTime ?? '',
          ...product.tags,
        ], trimmed);
      })
      .slice(offset, offset + limit);
  });
}

export async function getCTProductByKey(key: string): Promise<CTProductProjection | null> {
  try {
    return await ctRequest<CTProductProjection>(`/product-projections/key=${encodeURIComponent(key)}?staged=false`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('CT API error 404')) {
      return null;
    }
    throw error;
  }
}

export async function getCTTourProductByKey(key: string): Promise<TourProduct | null> {
  return withCache(`ct:products:key:${key}`, async () => {
    const product = await getCTProductByKey(key);
    return product ? ctProjectionToTourProduct(product) : null;
  });
}

export async function getEventById(id: string): Promise<TourProduct | null> {
  return withCache(`ct:products:id:${id}`, async () => {
    try {
      const product = await ctRequest<CTProduct>(`/products/${encodeURIComponent(id)}`);
      return ctProductToTourProduct(product);
    } catch (error) {
      if (error instanceof Error && error.message.includes('CT API error 404')) {
        return null;
      }
      throw error;
    }
  });
}

export async function getRooms(limit = 20, offset = 0): Promise<RoomProduct[]> {
  const productTypeId = await resolveProductTypeId(ROOM_PRODUCT_TYPE_ID, ROOM_PRODUCT_TYPE_KEY);
  const where = getProductTypeWhereClause(productTypeId);
  const data = await ctRequest<CTProductProjectionPagedQueryResponse>(
    buildProductProjectionPath({ limit, offset, where })
  );
  const projections = data.results ?? [];
  const rooms = projections.map(ctProjectionToRoom);
  const skuList = projections.map((p) => p.masterVariant.sku).filter(Boolean) as string[];
  const inventoryMap = await fetchInventoryMap(skuList);
  return applyInventory(rooms, projections, inventoryMap);
}

export async function searchRooms(query: string, limit = 20, offset = 0): Promise<RoomProduct[]> {
  const trimmed = query.trim();
  const cacheScope = ROOM_PRODUCT_TYPE_ID || ROOM_PRODUCT_TYPE_KEY || 'all';
  return withCache(`ct:rooms:search:${trimmed}:${limit}:${offset}:${cacheScope}`, async () => {
    const productTypeId = await resolveProductTypeId(ROOM_PRODUCT_TYPE_ID, ROOM_PRODUCT_TYPE_KEY);
    const where = getProductTypeWhereClause(productTypeId);
    const data = await ctRequest<CTProductProjectionPagedQueryResponse>(
      buildProductProjectionPath({ limit, offset, where, text: trimmed })
    );

    const projections = data.results ?? [];
    const rooms = projections.map(ctProjectionToRoom);
    const skuList = projections.map((p) => p.masterVariant.sku).filter(Boolean) as string[];
    const inventoryMap = await fetchInventoryMap(skuList);
    const enriched = applyInventory(rooms, projections, inventoryMap);
    return enriched.filter((room) =>
      matchesSearchTokens(
        [room.name, room.description, room.category, room.amenity, room.roomNumber, String(room.floor), ...room.amenities],
        trimmed
      )
    );
  });
}

export async function getRoomById(id: string): Promise<RoomProduct> {
  const data = await ctRequest<CTProductProjection>(`/product-projections/${id}?staged=false`);
  const room = ctProjectionToRoom(data);
  const sku = data.masterVariant.sku;
  if (sku) {
    const inventoryMap = await fetchInventoryMap([sku]);
    const qty = inventoryMap.get(sku);
    if (qty !== undefined) return { ...room, inventory: qty };
  }
  return room;
}

export async function createCTProduct(draft: Record<string, unknown>): Promise<CTProductProjection> {
  return ctRequest<CTProductProjection>('/products', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
}

export async function updateCTProduct(
  id: string,
  version: number,
  actions: Record<string, unknown>[]
): Promise<CTProductProjection> {
  return ctRequest<CTProductProjection>(`/products/${id}`, {
    method: 'POST',
    body: JSON.stringify({ version, actions }),
  });
}

export async function publishCTProduct(id: string, version: number): Promise<CTProductProjection> {
  return ctRequest<CTProductProjection>(`/products/${id}`, {
    method: 'POST',
    body: JSON.stringify({
      version,
      actions: [{ action: 'publish' }],
    }),
  });
}
