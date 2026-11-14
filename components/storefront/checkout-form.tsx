"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Banknote, Smartphone, Tag, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/storefront/copy-button";
import { checkPromoCode, placeOrder, type CheckoutState } from "@/app/(storefront)/checkout/actions";
import { cartSubtotal, useCart } from "@/lib/cart/store";
import { useIsClient } from "@/lib/cart/use-is-client";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { computeDiscount } from "@/lib/promo";
import { useShopContact } from "@/lib/shop-context";
import { cn } from "@/lib/utils";
import type { DiscountType, PaymentMethod } from "@/types/database";

type Zone = { id: string; zone_name: string; delivery_fee: number };
type AppliedPromo = { code: string; discount_type: DiscountType; discount_value: number };

export function CheckoutForm({ zones }: { zones: Zone[] }) {
  const { t } = useI18n();
  const { whishNumber } = useShopContact();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const items = useCart((s) => s.items);
  const ready = useIsClient();
  const [zoneId, setZoneId] = useState(state.values?.shipping_zone_id ?? "");
  const [method, setMethod] = useState<PaymentMethod>(state.values?.payment_method === "whish" ? "whish" : "cod");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, startPromoCheck] = useTransition();

  if (!ready) return <p className="text-muted-foreground">{t.loading}</p>;

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

  const v = state.values;
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const subtotal = cartSubtotal(items);
  const discount = promo ? computeDiscount(subtotal, promo.discount_type, promo.discount_value) : 0;
  const zone = zones.find((z) => z.id === zoneId);
  const total = subtotal - discount + (zone?.delivery_fee ?? 0);

  function applyPromo() {
    setPromoError("");
    if (!promoInput.trim()) return;
    startPromoCheck(async () => {
      const result = await checkPromoCode(promoInput);
      if (result.ok) {
        setPromo({ code: result.code, discount_type: result.discount_type, discount_value: result.discount_value });
        setPromoInput("");
      } else {
        setPromo(null);
        setPromoError(result.error);
      }
    });
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ product_id: i.id, quantity: i.quantity })))} />
      <input type="hidden" name="promo_code" value={promo?.code ?? ""} />
      {/* honeypot: hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        {state.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Field label={t.checkout.fullName} id="customer_name" error={err("customer_name")}>
          <Input id="customer_name" name="customer_name" required autoComplete="name" defaultValue={v?.customer_name ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.checkout.phone} id="phone1" error={err("phone1")}>
            <Input id="phone1" name="phone1" type="tel" dir="ltr" required autoComplete="tel" defaultValue={v?.phone1 ?? ""} />
          </Field>
          <Field label={t.checkout.phone2} id="phone2" error={err("phone2")}>
            <Input id="phone2" name="phone2" type="tel" dir="ltr" defaultValue={v?.phone2 ?? ""} />
          </Field>
        </div>

        <Field label={t.checkout.area} id="shipping_zone_id" error={err("shipping_zone_id")}>
          <select
            id="shipping_zone_id"
            name="shipping_zone_id"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              {t.checkout.selectArea}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {t.checkout.zoneOption(z.zone_name, formatMoney(z.delivery_fee))}
              </option>
            ))}
          </select>
          {zones.length === 0 && <p className="text-sm text-destructive">{t.checkout.deliveryUnavailable}</p>}
        </Field>

        <Field label={t.checkout.address} id="address" error={err("address")}>
          <Textarea id="address" name="address" rows={3} required autoComplete="street-address" defaultValue={v?.address ?? ""} />
        </Field>

        <Field label={t.checkout.notes} id="notes" error={err("notes")}>
          <Textarea id="notes" name="notes" rows={2} defaultValue={v?.notes ?? ""} />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t.checkout.paymentMethod}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentOption
              value="cod"
              checked={method === "cod"}
              onSelect={setMethod}
              icon={<Banknote className="size-5" />}
              title={t.checkout.cod}
              hint={t.checkout.codHint}
            />
            <PaymentOption
              value="whish"
              checked={method === "whish"}
              onSelect={setMethod}
              icon={<Smartphone className="size-5" />}
              title={t.checkout.whish}
              hint={t.checkout.whishHint}
            />
          </div>
          {err("payment_method") && <p className="text-sm text-destructive">{err("payment_method")}</p>}

          {method === "whish" && (
            <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="text-sm text-muted-foreground">{t.checkout.whishSendTo}</div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-wider" dir="ltr">
                  {whishNumber}
                </span>
                <CopyButton value={whishNumber} />
              </div>
              <p className="text-sm">{t.checkout.whishInstructions(formatMoney(total))}</p>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold">{t.checkout.yourOrder}</h2>
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

        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="promo_input">{t.checkout.promoCode}</Label>
          {promo ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
              <span className="flex items-center gap-2">
                <Tag className="size-4" />
                <span className="font-semibold" dir="ltr">
                  {promo.code}
                </span>
                <span>
                  (
                  {promo.discount_type === "percentage"
                    ? t.checkout.percentOff(promo.discount_value)
                    : t.checkout.amountOff(formatMoney(promo.discount_value))}
                  )
                </span>
              </span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.checkout.removePromo} onClick={() => setPromo(null)}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="promo_input"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter applies the code instead of submitting the whole order
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPromo();
                  }
                }}
                placeholder={t.checkout.enterCode}
                autoComplete="off"
                dir="ltr"
                className="uppercase placeholder:normal-case"
              />
              <Button type="button" variant="outline" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()}>
                {checkingPromo ? t.checkout.checking : t.checkout.apply}
              </Button>
            </div>
          )}
          {promoError && (
            <p role="alert" className="text-sm text-destructive">
              {promoError}
            </p>
          )}
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t.checkout.subtotal}</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          {discount > 0 && promo && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>{t.checkout.discount(promo.code)}</span>
              <span className="tabular-nums" dir="ltr">
                −{formatMoney(discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t.checkout.delivery}</span>
            <span className="tabular-nums">{zone ? formatMoney(zone.delivery_fee) : t.checkout.chooseArea}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>{t.checkout.totalToPay}</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-sm">{method === "cod" ? t.checkout.codNote : t.checkout.whishNote}</p>
        <Button type="submit" size="lg" className="w-full" disabled={pending || checkingPromo || zones.length === 0}>
          {pending ? t.checkout.placing : t.checkout.placeOrder}
        </Button>
        <p className="text-xs text-muted-foreground">{t.checkout.finalPrices}</p>
      </aside>
    </form>
  );
}

function PaymentOption({
  value,
  checked,
  onSelect,
  icon,
  title,
  hint,
}: {
  value: PaymentMethod;
  checked: boolean;
  onSelect: (v: PaymentMethod) => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      <input
        type="radio"
        name="payment_method"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="mt-1 size-4 accent-primary"
      />
      <span className="space-y-1">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
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
