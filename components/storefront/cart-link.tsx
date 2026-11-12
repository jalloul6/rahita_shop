"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";
import { useI18n } from "@/lib/i18n/client";

export function CartLink() {
  const { t } = useI18n();
  const items = useCart((s) => s.items);
  const ready = useIsClient();
  const count = ready ? cartCount(items) : 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground sm:px-3"
      aria-label={t.header.cartAria(count)}
    >
      <ShoppingBag className="size-5" />
      <span className="hidden sm:inline">{t.header.cart}</span>
      {count > 0 && (
        <span className="absolute -end-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
