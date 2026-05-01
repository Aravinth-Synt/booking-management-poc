import type { CartItem } from '@/types';

const KEY = 'lsy_cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

export function addToCart(item: CartItem): void {
  const existing = getCart().filter((c) => c.roomId !== item.roomId);
  localStorage.setItem(KEY, JSON.stringify([...existing, item]));
}

export function removeFromCart(roomId: string): void {
  localStorage.setItem(KEY, JSON.stringify(getCart().filter((c) => c.roomId !== roomId)));
}

export function clearCart(): void {
  localStorage.removeItem(KEY);
}

export function isInCart(roomId: string): boolean {
  return getCart().some((c) => c.roomId === roomId);
}

export function cartTotal(): number {
  return getCart().reduce((sum, c) => sum + c.pricePerNight * c.nights, 0);
}
