'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  slug?: string;
};

const STORAGE_KEY = 'ecommerce_cart';

/** Une seule ligne par produit : on fusionne les doublons (somme des quantités). */
function normalizeCart(items: CartItem[]): CartItem[] {
  const byId = new Map<string, CartItem>();
  for (const it of items) {
    const id = it?.productId;
    if (!id || typeof it.price !== 'number' || typeof it.quantity !== 'number') continue;
    const existing = byId.get(id);
    if (existing) {
      existing.quantity = Math.min(999, existing.quantity + (it.quantity || 1));
    } else {
      byId.set(id, {
        productId: id,
        name: typeof it.name === 'string' ? it.name : '',
        price: Number(it.price),
        currency: typeof it.currency === 'string' ? it.currency : 'XOF',
        quantity: Math.max(1, Math.min(999, it.quantity || 1)),
        slug: typeof it.slug === 'string' ? it.slug : undefined,
      });
    }
  }
  return Array.from(byId.values());
}

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return normalizeCart(list);
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      currency: i.currency,
      quantity: i.quantity,
      slug: i.slug ?? undefined,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
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
  const pendingAddRef = useRef<Omit<CartItem, 'quantity'> & { quantity: number } | null>(null);

  useEffect(() => {
    setItems([]);
    saveToStorage([]);
    const onStorage = () => setItems(loadFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('cart-update', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cart-update', onStorage);
    };
  }, []);

  /** Un clic = une unité ajoutée (une seule fois même si React exécute l’updater deux fois en Strict Mode). */
  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const qty = Math.max(1, Math.min(999, item.quantity ?? 1));
    pendingAddRef.current = { ...item, quantity: qty };
    setItems((prev) => {
      const pending = pendingAddRef.current;
      if (!pending) return prev;
      pendingAddRef.current = null;
      const idx = prev.findIndex((i) => i.productId === pending.productId);
      const next: CartItem[] =
        idx >= 0
          ? prev.map((i, iidx) =>
              iidx === idx ? { ...i, quantity: Math.min(999, i.quantity + pending.quantity) } : i
            )
          : [...prev, { ...pending, quantity: pending.quantity }];
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
