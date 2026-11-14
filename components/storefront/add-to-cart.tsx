"use client";

import { useState } from "react";
import { Check, MessageCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import type { StoreProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useShopContact } from "@/lib/shop-context";

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
  const { t } = useI18n();
  const add = useCart((s) => s.add);
  const [added, flash] = useAddedFlash();

  if (product.stock_quantity < 1) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        {t.product.outOfStock}
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
      {added ? t.product.added : t.product.addToCart}
    </Button>
  );
}

// Quantity stepper + button for the product page.
export function AddToCart({ product }: { product: Props }) {
  const { t } = useI18n();
  const { whatsappLink, shopName } = useShopContact();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, flash] = useAddedFlash();
  const max = Math.min(product.stock_quantity, 99);

  if (product.stock_quantity < 1) {
    return (
      <Button size="lg" disabled>
        {t.product.outOfStock}
      </Button>
    );
  }

  function orderViaWhatsApp() {
    const price =
      qty > 1
        ? `${formatMoney(product.price)} × ${qty} = ${formatMoney(product.price * qty)}`
        : formatMoney(product.price);
    const message = t.product.whatsappMessage(shopName, product.name, qty, price, window.location.href);
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border" dir="ltr">
          <Button variant="ghost" size="icon" aria-label={t.product.decrease} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center tabular-nums" aria-live="polite">
            {qty}
          </span>
          <Button variant="ghost" size="icon" aria-label={t.product.increase} onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>
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
          {added ? t.product.addedToCart : t.product.addToCart}
        </Button>
      </div>
      <button
        type="button"
        onClick={orderViaWhatsApp}
        className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#25D366] px-5 text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366] hover:text-white dark:text-[#25D366] dark:hover:text-white"
      >
        <MessageCircle className="size-5" />
        {t.product.whatsappOrder}
      </button>
    </div>
  );
}
