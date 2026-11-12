import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const t = await getDictionary();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.cart.title}</h1>
      <CartView />
    </div>
  );
}
