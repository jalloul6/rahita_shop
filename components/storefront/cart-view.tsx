"use client";

import Link from "next/link";
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cartSubtotal, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartView() {
  const { items, setQty, remove } = useCart();
  const ready = useIsClient();

  if (!ready) return <p className="text-muted-foreground">Loading your cart…</p>;

  if (items.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/products" className={cn(buttonVariants())}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y rounded-2xl border bg-card shadow-sm">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 p-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex justify-between gap-2">
                <Link href={`/products/${item.id}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <span className="font-semibold tabular-nums">{formatMoney(item.price * item.quantity)}</span>
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">{formatMoney(item.price)} each</div>
              <div className="mt-auto flex items-center justify-between">
                <div className="inline-flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon-sm" aria-label="Decrease quantity" onClick={() => setQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                  <Button variant="ghost" size="icon-sm" aria-label="Increase quantity" onClick={() => setQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold">Order summary</h2>
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(cartSubtotal(items))}</span>
        </div>
        <p className="text-xs text-muted-foreground">Shipping is added at checkout based on your area. Pay cash on delivery.</p>
        <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Checkout
        </Link>
      </aside>
    </div>
  );
}
