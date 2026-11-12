import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getCheckoutZones } from "@/lib/data/storefront";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const t = await getDictionary();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.checkout.title}</h1>
      <Suspense fallback={<p className="text-muted-foreground">{t.loading}</p>}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const zones = await getCheckoutZones();
  return <CheckoutForm zones={zones} />;
}
