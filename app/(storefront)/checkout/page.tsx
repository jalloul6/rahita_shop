import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getCheckoutZones } from "@/lib/data/storefront";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const zones = await getCheckoutZones();
  return <CheckoutForm zones={zones} />;
}
