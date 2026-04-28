import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="navbar-glass fixed top-0 left-0 right-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-display text-xl font-semibold tracking-wide text-forest-500">
            London<span className="text-gold-600">Stay</span>
          </span>
          <span className="hidden sm:inline text-xs text-gray-400 border border-ivory-200 px-1.5 py-0.5 font-body">POC</span>
        </Link>
        <div className="flex items-center gap-6">
           <Link href="/events" className="text-sm text-gray-500 hover:text-forest-600 font-medium transition-colors tracking-wide">
            Events
          </Link>
          <Link href="/rooms" className="text-sm text-gray-500 hover:text-forest-600 font-medium transition-colors tracking-wide">
            Rooms
          </Link>
          <Link
            href="/rooms"
            className="bg-forest-500 hover:bg-forest-600 text-white text-xs font-medium px-5 py-2 tracking-wider uppercase transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
