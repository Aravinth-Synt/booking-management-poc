'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

interface OrderItem {
  ref: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
}

interface Order {
  guestName: string;
  grandTotal: number;
  items: OrderItem[];
}

function AnimatedCheck() {
  return (
    <div className="relative w-28 h-28 mx-auto mb-6">
      <div className="absolute inset-0 rounded-full bg-forest-100 animate-ping opacity-20" />
      <div className="relative w-28 h-28 rounded-full bg-forest-500 flex items-center justify-center shadow-xl shadow-forest-200/50">
        <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  );
}

function ThankYouContent() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lsy_order');
      if (raw) {
        setOrder(JSON.parse(raw) as Order);
        sessionStorage.removeItem('lsy_order');
      }
    } catch { /* ignore */ }
  }, []);

  const firstName = order?.guestName?.split(' ')[0] ?? 'Guest';

  return (
    <div className="min-h-screen bg-ivory-50 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 bg-forest-100 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-100 rounded-full opacity-15 translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-10">
          <AnimatedCheck />
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">Booking Complete</p>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold text-gray-900 mb-2">Thank You</h1>
          <p className="font-display text-3xl italic text-forest-500 mb-4">{firstName}!</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
            {order && order.items.length > 1
              ? `Your ${order.items.length} rooms at LondonStay are confirmed. We look forward to welcoming you.`
              : 'Your reservation at LondonStay is confirmed. We look forward to welcoming you.'}
          </p>
        </div>

        {order && (
          <div className="bg-white border border-ivory-200 overflow-hidden mb-6 shadow-sm">
            {/* Header strip */}
            <div className="bg-gradient-to-r from-forest-600 to-forest-500 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-forest-200 text-xs uppercase tracking-widest mb-1">
                    {order.items.length > 1 ? `${order.items.length} Rooms Booked` : 'Booking Reference'}
                  </p>
                  <p className="font-mono text-xl font-bold tracking-wider">
                    {order.items.length === 1 ? order.items[0].ref : order.items.map(i => i.ref).join(' · ')}
                  </p>
                </div>
                <span className="bg-white/20 border border-white/30 px-3 py-1.5 text-xs font-semibold rounded-sm tracking-wide">
                  ✓ Confirmed
                </span>
              </div>
            </div>

            {/* Per-room rows */}
            <div className="divide-y divide-ivory-100">
              {order.items.map((item) => (
                <div key={item.ref} className="px-6 py-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-800 text-sm">{item.roomName}</p>
                    <p className="text-forest-600 font-semibold text-sm shrink-0 ml-3">{formatCurrency(item.total)}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(item.checkIn)} → {formatDate(item.checkOut)} · {item.nights} night{item.nights !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">{item.ref}</p>
                </div>
              ))}
            </div>

            {/* Grand total */}
            {order.items.length > 1 && (
              <div className="px-6 py-4 bg-ivory-50 border-t border-ivory-200 flex justify-between items-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Grand Total</p>
                <p className="font-display text-2xl font-semibold text-forest-600">{formatCurrency(order.grandTotal)}</p>
              </div>
            )}

            {/* What's next */}
            <div className="bg-ivory-50 border-t border-ivory-200 px-6 py-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">What&apos;s Next</p>
              <div className="space-y-2 text-xs text-gray-500">
                {[
                  { d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: <>Check-in from <strong>3:00 PM</strong>, check-out by <strong>11:00 AM</strong></> },
                  { d: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', text: <>Concierge: <strong>+44 20 7946 0958</strong> (24/7)</> },
                  { d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'A confirmation email has been sent to your registered address.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-gold-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.d} />
                    </svg>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/rooms"
            className="flex-1 flex items-center justify-center gap-2 bg-forest-500 hover:bg-forest-600 text-white py-3.5 text-sm font-medium tracking-wider uppercase transition-colors"
          >
            ← Browse More Rooms
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-ivory-200 hover:border-forest-200 text-gray-600 py-3.5 text-sm font-medium tracking-wider uppercase transition-colors"
          >
            Print Receipt
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="font-medium text-forest-500">commercetools</span> × <span className="font-medium text-gold-600">Redis</span> · LondonStay POC
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory-50 flex items-center justify-center"><div className="skeleton h-8 w-64 rounded" /></div>}>
      <ThankYouContent />
    </Suspense>
  );
}
