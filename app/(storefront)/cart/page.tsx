import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Your cart</h1>
      <CartView />
    </div>
  );
}
