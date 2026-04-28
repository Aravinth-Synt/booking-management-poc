import Link from 'next/link';
import Navbar from '@/components/Navbar';

const STATS = [
  { label: 'Room Types', value: '5' },
  { label: 'Location', value: 'Central London' },
  { label: 'Concierge', value: '24/7' },
  { label: 'From', value: '£95/night' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Browse Rooms',
    description: 'Explore our curated selection of luxury, moderate, and budget rooms — all sourced live from our commercetools catalogue.',
  },
  {
    step: '02',
    title: 'Reserve Your Room',
    description: 'Select your dates and click Reserve. Your room is instantly locked for 10 minutes via Redis, preventing double bookings.',
  },
  {
    step: '03',
    title: 'Confirm & Check In',
    description: 'Complete your guest details and confirm your booking. Receive your booking reference instantly. Check in from 3pm.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[640px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <p className="text-gold-400 font-body text-xs uppercase tracking-[0.3em] mb-5 animate-on-load stagger-1">
            London&apos;s Premier Boutique Hotel
          </p>
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-semibold leading-none mb-6 animate-on-load stagger-2">
            London&apos;s
            <br />
            <span className="italic text-gold-300">Finest Stays</span>
          </h1>
          <p className="text-white/75 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed font-light animate-on-load stagger-3">
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
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white text-white font-medium px-8 py-4 rounded-none transition-colors text-sm tracking-wider uppercase"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-forest-500 py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-gold-400 font-display text-2xl font-semibold">{s.value}</p>
              <p className="text-white/60 text-xs tracking-wider uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-3">Simple Process</p>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900">How It Works</h2>
          <div className="gold-divider w-24 mx-auto mt-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-14 h-14 rounded-full bg-forest-50 border-2 border-forest-200 flex items-center justify-center mx-auto mb-5">
                <span className="font-display text-xl font-semibold text-forest-500">{step.step}</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ivory-200 py-10 text-center text-sm text-gray-400">
        <p className="font-display text-lg text-gray-700 mb-1">LondonStay POC</p>
        <p className="text-xs">Powered by <span className="text-forest-500 font-medium">commercetools</span> × <span className="text-gold-600 font-medium">Redis</span> · Next.js 14</p>
      </footer>
    </div>
  );
}
