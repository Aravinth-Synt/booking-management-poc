'use client';

import { useEffect, useState } from 'react';
import TourCard from '@/components/TourCard';
import type { TourProduct } from '@/types';

export default function ProductExplorer() {
  const [products, setProducts] = useState<TourProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'ct' | 'mock'>('ct');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError('');

      const endpoint = search.trim()
        ? `/api/commercetools/products/search?q=${encodeURIComponent(search.trim())}`
        : '/api/commercetools/products';

      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? `Request failed with ${response.status}`);
        }
        if (cancelled) return;

        setProducts(data.products ?? []);
        setSource(data.source ?? 'ct');
        setError(data.error ?? '');
      } catch {
        if (cancelled) return;
        setProducts([]);
        setSource('ct');
        setError('Unable to load commercetools products right now. Check your commercetools env values.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadProducts, search.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
        <div>
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-3">Live Catalogue</p>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900 mb-2">
            Browse Products
          </h2>
          <p className="text-gray-500 max-w-2xl">
            Search synced commercetools products and open the booking flow with real catalogue data.
          </p>
        </div>

        <div className="w-full md:w-80">
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, tag, or location"
            className="w-full border border-ivory-300 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-8">
        <span>{products.length} product{products.length !== 1 ? 's' : ''}</span>
        {error && <span className="text-coral-600">{error}</span>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
              <div className="skeleton h-48 w-full" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-5 w-2/3 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-ivory-200 px-6 py-16 text-center">
          <p className="font-display text-2xl text-gray-900 mb-2">No products found</p>
          <p className="text-gray-500">Try a different product code, tag, or location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <TourCard key={`${product.rezdyCode}-${index}`} tour={product} delay={index * 0.04} />
          ))}
        </div>
      )}
    </section>
  );
}
