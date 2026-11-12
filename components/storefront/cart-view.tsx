"use client";

import Link from "next/link";
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cartSubtotal, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function CartView() {
  const { t } = useI18n();
  const { items, setQty, remove } = useCart();
  const ready = useIsClient();

  if (!ready) return <p className="text-muted-foreground">{t.cart.loading}</p>;

  if (items.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">{t.cart.empty}</p>
        <Link href="/products" className={cn(buttonVariants())}>
          {t.cart.browse}
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
              <div className="text-sm text-muted-foreground tabular-nums">{t.cart.each(formatMoney(item.price))}</div>
              <div className="mt-auto flex items-center justify-between">
                <div className="inline-flex items-center rounded-lg border" dir="ltr">
                  <Button variant="ghost" size="icon-sm" aria-label={t.product.decrease} onClick={() => setQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={t.product.increase} onClick={() => setQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(item.id)} aria-label={t.cart.removeAria(item.name)}>
                  <Trash2 className="size-4" /> {t.cart.remove}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold">{t.cart.summary}</h2>
        <div className="flex justify-between text-sm">
          <span>{t.cart.subtotal}</span>
          <span className="tabular-nums">{formatMoney(cartSubtotal(items))}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t.cart.shippingNote}</p>
        <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {t.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}
