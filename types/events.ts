
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
}