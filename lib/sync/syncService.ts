import { getRezdyProducts, getRezdyImageUrl, formatRezdyLocation, rezdyToTourProduct } from '@/lib/rezdy/service';
import {
  getCTProductByKey,
  createCTProduct,
  updateCTProduct,
  publishCTProduct,
} from '@/lib/commercetools/products';
import type { RezdyProduct, TourProduct, SyncResult, FullSyncReport, LocalizedString } from '@/types';

const PRODUCT_TYPE_ID = process.env.CT_PRODUCT_TYPE_ID ?? 'placeholder-product-type-id';

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function rezdyToCtDraft(product: RezdyProduct): Record<string, unknown> {
  const price = product.advertisedPrice ?? product.priceOptions?.[0]?.price ?? 0;
  const centAmount = Math.round(price * 100);
  const currency = product.currency ?? 'AUD';
  const imageUrl = getRezdyImageUrl(product);

  const name: LocalizedString = { en: product.name };
  const description: LocalizedString = {
    en: product.description ?? product.shortDescription ?? product.name,
  };
  const productSlug: LocalizedString = { en: slug(product.productCode + '-' + product.name) };

  return {
    key: product.productCode,
    productType: { typeId: 'product-type', id: PRODUCT_TYPE_ID },
    name,
    description,
    slug: productSlug,
    masterVariant: {
      sku: product.productCode,
      prices: centAmount > 0
        ? [{ value: { type: 'centPrecision', currencyCode: currency, centAmount, fractionDigits: 2 } }]
        : [],
      images: imageUrl ? [{ url: imageUrl, label: product.name, dimensions: { w: 800, h: 600 } }] : [],
      attributes: [
        { name: 'rezdy-product-code', value: product.productCode },
        { name: 'rezdy-duration', value: product.durationMinutes ?? 0 },
        { name: 'rezdy-location', value: formatRezdyLocation(product) },
        { name: 'rezdy-tags', value: (product.tags ?? []).join(',') },
      ],
    },
    variants: [],
    publish: true,
  };
}

export async function syncProduct(product: RezdyProduct): Promise<SyncResult> {
  const base: Pick<SyncResult, 'productCode' | 'name'> = {
    productCode: product.productCode,
    name: product.name,
  };

  try {
    const existing = await getCTProductByKey(product.productCode);
    const draft = rezdyToCtDraft(product);

    if (!existing) {
      await createCTProduct(draft);
      return { ...base, action: 'created' };
    }

    const actions: Record<string, unknown>[] = [
      { action: 'changeName', name: { en: product.name }, staged: true },
      {
        action: 'setDescription',
        description: { en: product.description ?? product.shortDescription ?? product.name },
        staged: true,
      },
    ];

    const price = product.advertisedPrice ?? product.priceOptions?.[0]?.price ?? 0;
    if (price > 0) {
      const centAmount = Math.round(price * 100);
      const currency = product.currency ?? 'AUD';
      const variant = existing.masterVariant;
      if (variant.prices && variant.prices.length > 0) {
        actions.push({
          action: 'changePrice',
          priceId: variant.prices[0].id,
          price: {
            value: { type: 'centPrecision', currencyCode: currency, centAmount, fractionDigits: 2 },
          },
          staged: true,
        });
      }
    }

    const updated = await updateCTProduct(existing.id, existing.version, actions);
    await publishCTProduct(updated.id, updated.version);
    return { ...base, action: 'updated' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...base, action: 'error', error: message };
  }
}

export async function runFullSync(): Promise<FullSyncReport> {
  const start = Date.now();
  const products = await getRezdyProducts(100, 0);

  const report: FullSyncReport = {
    total: products.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    results: [],
    durationMs: 0,
  };

  for (const product of products) {
    const result = await syncProduct(product);
    report.results.push(result);
    if (result.action === 'created') report.created++;
    else if (result.action === 'updated') report.updated++;
    else if (result.action === 'skipped') report.skipped++;
    else if (result.action === 'error') report.errors++;
  }

  report.durationMs = Date.now() - start;
  return report;
}

export { rezdyToTourProduct };
