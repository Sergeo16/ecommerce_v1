'use client';

import { createContext, useContext, useCallback, useEffect, useState } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  slug?: string;
};

const STORAGE_KEY = 'ecommerce_cart';

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('cart-update'));
  } catch {}
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadFromStorage());
    const onStorage = () => setItems(loadFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('cart-update', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cart-update', onStorage);
    };
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = Math.max(1, Math.min(999, item.quantity ?? 1));
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === item.productId);
      let next: CartItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], quantity: Math.min(999, next[idx].quantity + qty) };
      } else {
        next = [...prev, { ...item, quantity: qty }];
      }
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const q = Math.max(0, Math.min(999, quantity));
    setItems((prev) => {
      const next = q === 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, quantity: q } : i));
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
