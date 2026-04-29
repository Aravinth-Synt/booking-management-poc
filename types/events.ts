
export type EventCategory = 'Sports' | 'Culture' | 'Music';


export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  category: EventCategory;
  image: string;
  price?: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  ticketUrl?: string;
  saleStart?: string;
  saleEnd?: string;
  statusLabel?: string;
  genre?: string;
  subGenre?: string;
  externalEventId?: string;
}
