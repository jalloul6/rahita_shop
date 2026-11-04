"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import type { StoreProduct } from "@/lib/data/storefront";

type Props = Pick<StoreProduct, "id" | "name" | "price" | "image_url" | "stock_quantity">;

function toItem(p: Props) {
  return { id: p.id, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock_quantity };
}

function useAddedFlash() {
  const [added, setAdded] = useState(false);
  return [
    added,
    () => {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    },
  ] as const;
}

// Compact button for product cards.
export function QuickAdd({ product }: { product: Props }) {
  const add = useCart((s) => s.add);
  const [added, flash] = useAddedFlash();

  if (product.stock_quantity < 1) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        Out of stock
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      className="w-full"
      onClick={() => {
        add(toItem(product));
        flash();
      }}
    >
      {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
      {added ? "Added" : "Add to cart"}
    </Button>
  );
}

// Quantity stepper + button for the product page.
export function AddToCart({ product }: { product: Props }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, flash] = useAddedFlash();
  const max = Math.min(product.stock_quantity, 99);

  if (product.stock_quantity < 1) {
    return (
      <Button size="lg" disabled>
        Out of stock
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center rounded-lg border">
        <Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center tabular-nums" aria-live="polite">
          {qty}
        </span>
        <Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>
          <Plus className="size-4" />
        </Button>
      </div>
      <Button
        size="lg"
        onClick={() => {
          add(toItem(product), qty);
          flash();
        }}
      >
        {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
        {added ? "Added to cart" : "Add to cart"}
      </Button>
    </div>
  );
}
