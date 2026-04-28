import type { TourProduct, RezdySession } from '@/types';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);
const threeDays = new Date();
threeDays.setDate(threeDays.getDate() + 3);

const fmt = (d: Date, h: number) => {
  const p = d.toISOString().split('T')[0];
  return `${p}T${String(h).padStart(2, '0')}:00:00`;
};

export const MOCK_TOURS: TourProduct[] = [
  {
    id: 'mock-001',
    name: 'Sydney Harbour Sunset Cruise',
    shortDescription: 'Glide across iconic Sydney Harbour as the sun dips below the horizon.',
    description:
      'Experience the magic of Sydney Harbour on this unforgettable sunset cruise. Enjoy panoramic views of the Opera House, Harbour Bridge, and the glittering city skyline as you sip drinks and watch the sky transform into a canvas of orange and pink.',
    imageUrl:
      'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
    price: 89,
    currency: 'AUD',
    durationMinutes: 120,
    location: 'Sydney, NSW',
    tags: ['cruise', 'sunset', 'harbour', 'scenic'],
    productType: 'TOUR',
    rezdyCode: 'SYDHBR001',
    syncStatus: 'synced',
  },
  {
    id: 'mock-002',
    name: 'Blue Mountains Day Trek',
    shortDescription: 'Hike through ancient rainforest to the iconic Three Sisters.',
    description:
      'Escape the city and immerse yourself in the stunning Blue Mountains National Park. Trek through lush eucalyptus forests, discover hidden waterfalls, and stand in awe at the majestic Three Sisters rock formation. A full-day adventure for nature lovers.',
    imageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    price: 145,
    currency: 'AUD',
    durationMinutes: 480,
    location: 'Blue Mountains, NSW',
    tags: ['hiking', 'nature', 'mountains', 'national-park'],
    productType: 'TOUR',
    rezdyCode: 'BLUMTN002',
    syncStatus: 'synced',
  },
  {
    id: 'mock-003',
    name: 'Great Barrier Reef Snorkel',
    shortDescription: 'Dive into the world\'s most spectacular coral ecosystem.',
    description:
      'Discover the wonders of the Great Barrier Reef on this guided snorkeling adventure. Swim alongside colourful fish, magnificent coral formations, and if you\'re lucky, spot a sea turtle or reef shark. All equipment provided, suitable for all skill levels.',
    imageUrl:
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
    price: 195,
    currency: 'AUD',
    durationMinutes: 240,
    location: 'Cairns, QLD',
    tags: ['snorkeling', 'reef', 'marine', 'underwater'],
    productType: 'TOUR',
    rezdyCode: 'GBRSNK003',
    syncStatus: 'pending',
  },
  {
    id: 'mock-004',
    name: 'Melbourne Coffee & Laneways Tour',
    shortDescription: 'Explore Melbourne\'s famous laneways and world-class coffee culture.',
    description:
      'Melbourne is famous for its vibrant coffee culture and hidden laneways filled with street art, boutique shops, and incredible cafés. Join our expert local guide as we weave through Hosier Lane, Degraves Street, and other hidden gems while sampling the city\'s finest brews.',
    imageUrl:
      'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80',
    price: 65,
    currency: 'AUD',
    durationMinutes: 180,
    location: 'Melbourne, VIC',
    tags: ['coffee', 'food', 'culture', 'walking'],
    productType: 'TOUR',
    rezdyCode: 'MELLNW004',
    syncStatus: 'synced',
  },
  {
    id: 'mock-005',
    name: 'Uluru Sunrise Camel Ride',
    shortDescription: 'Greet the dawn on camelback beside the sacred Uluru monolith.',
    description:
      'There\'s no more magical way to experience Uluru than from the back of a camel at sunrise. Watch the ancient sandstone monolith glow fiery red as the sun rises over the desert. This intimate small-group activity combines adventure with deep cultural reverence.',
    imageUrl:
      'https://images.unsplash.com/photo-1529948164883-2769b23ba1f5?w=800&q=80',
    price: 110,
    currency: 'AUD',
    durationMinutes: 90,
    location: 'Uluru, NT',
    tags: ['camel', 'sunrise', 'outback', 'cultural'],
    productType: 'ACTIVITY',
    rezdyCode: 'ULUCML005',
    syncStatus: 'synced',
  },
  {
    id: 'mock-006',
    name: 'Daintree Rainforest Night Walk',
    shortDescription: 'Uncover nocturnal secrets of the world\'s oldest tropical rainforest.',
    description:
      'The Daintree Rainforest comes alive after dark. On this guided night walk, you\'ll encounter tree frogs, luminescent fungi, nocturnal insects, and if you\'re very lucky, a Southern Cassowary. Your expert naturalist guide will illuminate the incredible biodiversity of this ancient ecosystem.',
    imageUrl:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    price: 79,
    currency: 'AUD',
    durationMinutes: 150,
    location: 'Daintree, QLD',
    tags: ['night', 'rainforest', 'wildlife', 'nature'],
    productType: 'TOUR',
    rezdyCode: 'DNTRNF006',
    syncStatus: 'error',
  },
];

export const MOCK_SESSIONS: RezdySession[] = [
  {
    id: 'sess-001',
    productCode: '',
    startTimeLocal: fmt(tomorrow, 9),
    endTimeLocal: fmt(tomorrow, 11),
    seatsAvailable: 12,
    seatsReserved: 3,
    priceOptions: [
      { label: 'Adult', type: 'ADULT', price: 89 },
      { label: 'Child', type: 'CHILD', price: 55 },
    ],
  },
  {
    id: 'sess-002',
    productCode: '',
    startTimeLocal: fmt(dayAfter, 14),
    endTimeLocal: fmt(dayAfter, 16),
    seatsAvailable: 8,
    seatsReserved: 6,
    priceOptions: [
      { label: 'Adult', type: 'ADULT', price: 89 },
      { label: 'Child', type: 'CHILD', price: 55 },
    ],
  },
  {
    id: 'sess-003',
    productCode: '',
    startTimeLocal: fmt(threeDays, 10),
    endTimeLocal: fmt(threeDays, 12),
    seatsAvailable: 20,
    seatsReserved: 2,
    priceOptions: [
      { label: 'Adult', type: 'ADULT', price: 89 },
      { label: 'Child', type: 'CHILD', price: 55 },
    ],
  },
];
