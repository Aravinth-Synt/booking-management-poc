'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import StepIndicator from '@/components/StepIndicator';
import type { TourProduct, RezdySession, BookingQuantity } from '@/types';
import { MOCK_TOURS, MOCK_SESSIONS } from '@/data/mockData';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80';
const STEPS = [
  { number: 1, label: 'Session' },
  { number: 2, label: 'Details' },
  { number: 3, label: 'Confirm' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
}

function formatDuration(minutes: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Product Sidebar ──────────────────────────────────────────────────────────

function ProductSidebar({
  product,
  session,
  quantities,
  total,
}: {
  product: TourProduct;
  session: RezdySession | null;
  quantities: BookingQuantity[];
  total: number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sand-100 overflow-hidden sticky top-24">
      <div className="relative h-44 bg-sand-100">
        <Image
          src={product.imageUrl || FALLBACK_IMAGE}
          alt={product.name}
          fill
          className="object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-gray-900 leading-snug mb-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-sand-500 mb-4">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {product.location}
          {product.durationMinutes > 0 && (
            <>
              <span className="mx-1">·</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(product.durationMinutes)}
            </>
          )}
        </div>

        <div className="text-xs text-sand-400 mb-1">Rezdy code</div>
        <div className="font-mono text-sm font-medium text-gray-700 mb-4 bg-sand-50 px-2 py-1 rounded">
          {product.rezdyCode}
        </div>

        {session && (
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 mb-4 text-sm">
            <div className="text-xs text-primary-600 font-medium mb-1">Selected session</div>
            <div className="text-gray-800">{formatDate(session.startTimeLocal)}</div>
            <div className="text-xs text-primary-600 mt-1">
              {session.seatsAvailable} seat{session.seatsAvailable !== 1 ? 's' : ''} available
            </div>
          </div>
        )}

        {quantities.filter((q) => q.value > 0).length > 0 && (
          <div className="space-y-1 mb-4">
            {quantities
              .filter((q) => q.value > 0)
              .map((q) => (
                <div key={q.optionLabel} className="flex justify-between text-sm">
                  <span className="text-sand-600">
                    {q.optionLabel} × {q.value}
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(q.price * q.value)}
                  </span>
                </div>
              ))}
          </div>
        )}

        <div className="border-t border-sand-100 pt-3 flex justify-between items-center">
          <span className="text-sm font-medium text-sand-600">Total</span>
          <span className="text-xl font-bold text-primary-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Session + Quantities ───────────────────────────────────────────

function Step1({
  sessions,
  loadingSessions,
  selectedSession,
  onSelectSession,
  quantities,
  onChangeQuantity,
}: {
  sessions: RezdySession[];
  loadingSessions: boolean;
  selectedSession: RezdySession | null;
  onSelectSession: (s: RezdySession) => void;
  quantities: BookingQuantity[];
  onChangeQuantity: (label: string, delta: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Choose a Session</h2>
        <p className="text-sand-500 text-sm">Select your preferred date and time</p>
      </div>

      {loadingSessions ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isSelected = selectedSession?.id === session.id;
            const scarce = session.seatsAvailable <= 5;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                className={`session-card rounded-xl border-2 p-4 ${
                  isSelected ? 'selected border-primary-500 bg-primary-50' : 'border-sand-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900">{formatDate(session.startTimeLocal)}</div>
                    <div className="text-sm text-sand-500 mt-0.5">
                      {session.seatsAvailable} seat{session.seatsAvailable !== 1 ? 's' : ''} remaining
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {scarce && (
                      <span className="text-xs bg-coral-50 text-coral-600 border border-coral-200 px-2 py-0.5 rounded-full font-medium">
                        Almost full!
                      </span>
                    )}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-sand-200'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <div>
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-3">Select Quantities</h3>
          <div className="bg-white rounded-xl border border-sand-100 divide-y divide-sand-50">
            {quantities.map((q) => (
              <div key={q.optionLabel} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-gray-800">{q.optionLabel}</div>
                  <div className="text-sm text-primary-600 font-medium">{formatCurrency(q.price)} each</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onChangeQuantity(q.optionLabel, -1)}
                    disabled={q.value === 0}
                    className="w-8 h-8 rounded-full border border-sand-200 flex items-center justify-center text-sand-600 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold text-gray-800">{q.value}</span>
                  <button
                    onClick={() => onChangeQuantity(q.optionLabel, 1)}
                    className="w-8 h-8 rounded-full border border-sand-200 flex items-center justify-center text-sand-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — Customer Details ────────────────────────────────────────────────

function Step2({
  customer,
  onChange,
}: {
  customer: { firstName: string; lastName: string; email: string; phone: string };
  onChange: (field: string, value: string) => void;
}) {
  const fields = [
    { name: 'firstName', label: 'First Name', type: 'text', required: true, half: true },
    { name: 'lastName', label: 'Last Name', type: 'text', required: true, half: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true, half: false },
    { name: 'phone', label: 'Phone Number', type: 'tel', required: false, half: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Your Details</h2>
        <p className="text-sand-500 text-sm">We&apos;ll send your booking confirmation to these details.</p>
      </div>

      <div className="bg-white rounded-xl border border-sand-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name} className={field.half ? '' : 'sm:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={field.type}
                value={customer[field.name]}
                onChange={(e) => onChange(field.name, e.target.value)}
                required={field.required}
                className="w-full border border-sand-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-shadow"
                placeholder={
                  field.name === 'phone' ? '+61 4xx xxx xxx' : ''
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Confirm ─────────────────────────────────────────────────────────

function Step3({
  product,
  session,
  quantities,
  customer,
  total,
}: {
  product: TourProduct;
  session: RezdySession;
  quantities: BookingQuantity[];
  customer: { firstName: string; lastName: string; email: string; phone: string };
  total: number;
}) {
  const rows = [
    { label: 'Tour', value: product.name },
    { label: 'Date', value: formatDate(session.startTimeLocal) },
    { label: 'Location', value: product.location },
    { label: 'Guest name', value: `${customer.firstName} ${customer.lastName}` },
    { label: 'Email', value: customer.email },
    { label: 'Phone', value: customer.phone || '—' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Confirm Your Booking</h2>
        <p className="text-sand-500 text-sm">Please review your booking before confirming.</p>
      </div>

      <div className="bg-white rounded-xl border border-sand-100 overflow-hidden">
        <div className="bg-primary-50 border-b border-primary-100 px-5 py-3">
          <p className="text-sm font-semibold text-primary-700">Booking Summary</p>
        </div>
        <div className="divide-y divide-sand-50">
          {rows.map((row) => (
            <div key={row.label} className="flex px-5 py-3 gap-4">
              <span className="text-sm text-sand-500 w-28 shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sand-100 overflow-hidden">
        <div className="bg-sand-50 border-b border-sand-100 px-5 py-3">
          <p className="text-sm font-semibold text-sand-600">Price Breakdown</p>
        </div>
        <div className="px-5 py-3 space-y-2">
          {quantities
            .filter((q) => q.value > 0)
            .map((q) => (
              <div key={q.optionLabel} className="flex justify-between text-sm">
                <span className="text-sand-600">
                  {q.optionLabel} × {q.value}
                </span>
                <span className="font-medium text-gray-800">{formatCurrency(q.price * q.value)}</span>
              </div>
            ))}
          <div className="border-t border-sand-100 pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary-600 text-lg">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-sand-400 text-center">
        By confirming, you agree to the booking terms and conditions. A confirmation email will be sent to {customer.email}.
      </p>
    </div>
  );
}

// ─── Main Booking Page ────────────────────────────────────────────────────────

function BookingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productCode = searchParams.get('productCode') ?? '';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [product, setProduct] = useState<TourProduct | null>(null);
  const [sessions, setSessions] = useState<RezdySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSession, setSelectedSession] = useState<RezdySession | null>(null);
  const [quantities, setQuantities] = useState<BookingQuantity[]>([]);
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  // Resolve product
  useEffect(() => {
    if (!productCode) return;
    fetch('/api/rezdy/products')
      .then((r) => r.json())
      .then((data) => {
        const tours: TourProduct[] = data.tours ?? MOCK_TOURS;
        const found = tours.find((t) => t.rezdyCode === productCode);
        setProduct(found ?? MOCK_TOURS[0]);
      })
      .catch(() => {
        const found = MOCK_TOURS.find((t) => t.rezdyCode === productCode);
        setProduct(found ?? MOCK_TOURS[0]);
      });
  }, [productCode]);

  // Fetch sessions
  useEffect(() => {
    if (!productCode) return;
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/rezdy/sessions?productCode=${productCode}&startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`)
      .then((r) => r.json())
      .then((data) => {
        const s: RezdySession[] = data.sessions ?? MOCK_SESSIONS;
        setSessions(s);
      })
      .catch(() => setSessions(MOCK_SESSIONS.map((s) => ({ ...s, productCode }))))
      .finally(() => setLoadingSessions(false));
  }, [productCode]);

  const handleSelectSession = useCallback((session: RezdySession) => {
    setSelectedSession(session);
    const opts = session.priceOptions ?? [
      { label: 'Adult', type: 'ADULT', price: product?.price ?? 89 },
    ];
    setQuantities(opts.map((o) => ({ optionLabel: o.label, value: 0, price: o.price })));
  }, [product]);

  const handleChangeQuantity = useCallback((label: string, delta: number) => {
    setQuantities((prev) =>
      prev.map((q) =>
        q.optionLabel === label ? { ...q, value: Math.max(0, q.value + delta) } : q
      )
    );
  }, []);

  const total = quantities.reduce((acc, q) => acc + q.price * q.value, 0);
  const totalGuests = quantities.reduce((acc, q) => acc + q.value, 0);

  function canProceed(): boolean {
    if (step === 1) return !!selectedSession && totalGuests > 0;
    if (step === 2) return !!customer.firstName && !!customer.lastName && !!customer.email;
    return true;
  }

  async function handleConfirm() {
    if (!product || !selectedSession) return;
    setSubmitting(true);

    const payload = {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      items: [
        {
          productCode: product.rezdyCode,
          startTimeLocal: selectedSession.startTimeLocal,
          endTimeLocal: selectedSession.endTimeLocal,
          quantities: quantities
            .filter((q) => q.value > 0)
            .map((q) => ({ optionLabel: q.optionLabel, value: q.value })),
          amount: total,
        },
      ],
      payments: [
        {
          type: 'CREDITCARD',
          amount: total,
          currency: product.currency ?? 'AUD',
          label: 'Credit Card',
        },
      ],
      sendNotifications: true,
    };

    try {
      const res = await fetch('/api/rezdy/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const orderNumber = data.booking?.orderNumber ?? `DEMO-${Date.now()}`;
      navigateToThankYou(orderNumber);
    } catch {
      navigateToThankYou(`DEMO-${Date.now()}`);
    }
  }

  function navigateToThankYou(orderNumber: string) {
    const params = new URLSearchParams({
      orderNumber,
      total: String(total),
      name: `${customer.firstName} ${customer.lastName}`,
      tour: product?.name ?? '',
      date: selectedSession?.startTimeLocal ?? '',
    });
    router.push(`/thank-you?${params.toString()}`);
  }

  if (!productCode || !product) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center pt-16">
          <div className="skeleton h-8 w-64 rounded mx-auto mb-4" />
          <div className="skeleton h-4 w-48 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="bg-sand-50 rounded-2xl">
              {step === 1 && (
                <Step1
                  sessions={sessions}
                  loadingSessions={loadingSessions}
                  selectedSession={selectedSession}
                  onSelectSession={handleSelectSession}
                  quantities={quantities}
                  onChangeQuantity={handleChangeQuantity}
                />
              )}
              {step === 2 && (
                <Step2
                  customer={customer}
                  onChange={(field, value) => setCustomer((prev) => ({ ...prev, [field]: value }))}
                />
              )}
              {step === 3 && selectedSession && (
                <Step3
                  product={product}
                  session={selectedSession}
                  quantities={quantities}
                  customer={customer}
                  total={total}
                />
              )}
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-6 py-3 border border-sand-200 rounded-xl text-sand-600 hover:text-gray-800 hover:border-sand-300 font-medium transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  disabled={!canProceed()}
                  className="px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-200 text-white font-semibold rounded-xl transition-colors"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <ProductSidebar
              product={product}
              session={selectedSession}
              quantities={quantities}
              total={total}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="skeleton h-8 w-64 rounded" />
      </div>
    }>
      <BookingPageInner />
    </Suspense>
  );
}
