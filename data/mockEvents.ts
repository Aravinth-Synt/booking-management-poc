import { Event } from "@/types/events";

export const MOCK_EVENTS: Event[] = [
  {
    id: 'event-001',
    name: 'London Marathon',
    description:
      'Join thousands of runners in the iconic London Marathon, a world-class event through the heart of the city.',
    date: '2024-10-06',
    category: 'Sports',
    price: '£50',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    eventType: 'Marathon',
  },
  {
    id: 'event-002',
    name: 'Notting Hill Carnival',
    description:
      'Experience the vibrant culture of London with music, dance, and amazing street food.',
    date: '2024-08-25',
    category: 'Culture',
    price: '£90',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    eventType: 'Carnival',
  },
  {
    id: 'event-003',
    name: 'British Summer Time Hyde Park',
    description:
      'Enjoy world-class music performances featuring top international artists.',
    date: '2024-07-05',
    category: 'Music',
    price: '£75',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    eventType: 'Concert',

  },
  {
    id: 'event-004',
    name: 'Wimbledon Tennis Championships',
    description:
      'Witness the thrill of world-class tennis at the most prestigious tournament.',
    date: '2024-06-24',
    category: 'Sports',
    price: '£120',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    eventType: 'Tennis',
  },
  {
    id: 'event-005',
    name: 'The Proms',
    description:
      'Experience classical music at its finest in the Royal Albert Hall.',
    date: '2024-08-01',
    category: 'Music',
    price: '£40',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    eventType: 'Concert',
  },
];