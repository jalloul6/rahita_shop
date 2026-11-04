"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder, type CheckoutState } from "@/app/(storefront)/checkout/actions";
import { cartSubtotal, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Zone = { id: string; zone_name: string; delivery_fee: number };

export function CheckoutForm({ zones }: { zones: Zone[] }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const items = useCart((s) => s.items);
  const ready = useIsClient();
  const [zoneId, setZoneId] = useState(state.values?.shipping_zone_id ?? "");

  if (!ready) return <p className="text-muted-foreground">Loading…</p>;

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

  const v = state.values;
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const subtotal = cartSubtotal(items);
  const zone = zones.find((z) => z.id === zoneId);
  const total = subtotal + (zone?.delivery_fee ?? 0);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ product_id: i.id, quantity: i.quantity })))} />
      {/* honeypot: hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-5">
        {state.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Field label="Full name" id="customer_name" error={err("customer_name")}>
          <Input id="customer_name" name="customer_name" required autoComplete="name" defaultValue={v?.customer_name ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone number" id="phone1" error={err("phone1")}>
            <Input id="phone1" name="phone1" type="tel" required autoComplete="tel" defaultValue={v?.phone1 ?? ""} />
          </Field>
          <Field label="Second phone (optional)" id="phone2" error={err("phone2")}>
            <Input id="phone2" name="phone2" type="tel" defaultValue={v?.phone2 ?? ""} />
          </Field>
        </div>

        <Field label="Area" id="shipping_zone_id" error={err("shipping_zone_id")}>
          <select
            id="shipping_zone_id"
            name="shipping_zone_id"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select your area
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.zone_name} (delivery {formatMoney(z.delivery_fee)})
              </option>
            ))}
          </select>
          {zones.length === 0 && <p className="text-sm text-destructive">Delivery is temporarily unavailable.</p>}
        </Field>

        <Field label="Detailed address" id="address" error={err("address")}>
          <Textarea id="address" name="address" rows={3} required autoComplete="street-address" defaultValue={v?.address ?? ""} />
        </Field>

        <Field label="Notes (optional)" id="notes" error={err("notes")}>
          <Textarea id="notes" name="notes" rows={2} defaultValue={v?.notes ?? ""} />
        </Field>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Your order</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">
                {i.quantity} × {i.name}
              </span>
              <span className="tabular-nums">{formatMoney(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="tabular-nums">{zone ? formatMoney(zone.delivery_fee) : "Choose your area"}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total to pay</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-sm">Cash on delivery: pay the courier when your order arrives.</p>
        <Button type="submit" size="lg" className="w-full" disabled={pending || zones.length === 0}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
        <p className="text-xs text-muted-foreground">Final prices are confirmed when the order is placed.</p>
      </aside>
    </form>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
