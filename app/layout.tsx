import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LondonStay — Luxury Hotel Booking',
  description: 'Premium London hotel rooms with real-time reservation locking powered by commercetools and Redis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-ivory-50 font-body antialiased">
        {children}
      </body>
    </html>
  );
}
