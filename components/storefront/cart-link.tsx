"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";

export function CartLink() {
  const items = useCart((s) => s.items);
  const ready = useIsClient();
  const count = ready ? cartCount(items) : 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag className="size-5" />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
