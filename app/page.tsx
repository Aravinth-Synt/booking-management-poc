import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HomeShowcase from '@/components/HomeShowcase';
import ProductExplorer from '@/components/ProductExplorer';

const STATS = [
  { label: 'Room Types', value: '5' },
  { label: 'Location', value: 'Central London' },
  { label: 'Concierge', value: '24/7' },
  { label: 'From', value: 'GBP 95/night' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-[72vh] min-h-[360px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <p className="text-gold-400 font-body text-xs uppercase tracking-[0.3em] mb-4 animate-on-load stagger-1">
            London&apos;s Premier Boutique Hotel
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-tight mb-5 animate-on-load stagger-2">
            London&apos;s
            <br />
            <span className="italic text-gold-300">Finest Stays</span>
          </h1>
          <p className="text-white/80 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed font-light animate-on-load stagger-3">
            5‑star service, curated rooms, instant booking — in the heart of London.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-on-load stagger-4">
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 bg-forest-500 hover:bg-forest-600 text-white font-medium px-8 py-4 rounded-none transition-colors text-sm tracking-wider uppercase"
            >
              Browse Rooms
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white font-medium px-8 py-4 rounded-none transition-colors text-sm tracking-wider uppercase"
            >
              Explore Events
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Stats ──
      <section className="bg-forest-500 py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-gold-400 font-display text-2xl font-semibold">{stat.value}</p>
              <p className="text-white/60 text-xs tracking-wider uppercase mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ── Product Explorer ── */}
      <HomeShowcase />

      {/* ── Footer ── */}

      <footer className="border-t border-ivory-200 py-10 text-center text-sm text-gray-400">
        <p className="font-display text-lg text-gray-700 mb-1">LondonStay POC</p>
        <p className="text-xs">
          Powered by <span className="text-forest-500 font-medium">commercetools</span> x{' '}
          <span className="text-gold-600 font-medium">Redis</span> · Next.js 14
        </p>
      </footer>
    </div>
  );
}
