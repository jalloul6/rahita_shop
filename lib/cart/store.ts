"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number; // snapshot for display only; the server re-prices at checkout
  image_url: string | null;
  stock: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const MAX_PER_ITEM = 99;
const clamp = (qty: number, stock: number) => Math.max(1, Math.min(qty, stock, MAX_PER_ITEM));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          if (item.stock < 1) return s;
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.id === item.id ? { ...i, ...item, quantity: clamp(i.quantity + qty, item.stock) } : i
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: clamp(qty, item.stock) }] };
        }),
      setQty: (id, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity: clamp(qty, i.stock) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "rahita-cart", storage: createJSONStorage(() => localStorage), version: 1 }
  )
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.price * i.quantity, 0);
