"use client";

import { useMemo, useState, useTransition } from "react";
import { ImageIcon, Minus, Plus, Search, Store, Phone, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkAdminPromo, createManualOrder, searchCustomers } from "@/app/(admin)/admin/orders/new/actions";
import { formatMoney } from "@/lib/format";
import { computeDiscount } from "@/lib/promo";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/i18n/admin-client";
import type { CustomerRow, DiscountType, PaymentMethod } from "@/types/database";

type Product = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
};
type Zone = { id: string; zone_name: string; delivery_fee: number };
type Source = "in_store" | "phone";
type Line = { product: Product; quantity: number };
type Promo = { code: string; discount_type: DiscountType; discount_value: number };

const METHODS: Record<Source, PaymentMethod[]> = {
  in_store: ["cash", "whish"],
  phone: ["cod", "whish", "cash"],
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PosForm({ products, zones }: { products: Product[]; zones: Zone[] }) {
  const { t } = useAdminT();
  const p = t.pos;
  const [source, setSource] = useState<Source>("in_store");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone1: "", phone2: "", address: "", notes: "" });
  const [zoneId, setZoneId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [checkingPromo, startPromo] = useTransition();
  const [saving, startSave] = useTransition();
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerRow[]>([]);
  const [searchingCust, startCustSearch] = useTransition();

  function findCustomers(value: string) {
    setCustQuery(value);
    if (value.trim().length < 2) return setCustResults([]);
    startCustSearch(async () => setCustResults(await searchCustomers(value)));
  }

  function pickCustomer(c: CustomerRow) {
    setCustomer((prev) => ({ ...prev, name: c.customer_name, phone1: c.phone, phone2: c.phone2 ?? "", address: c.address ?? "" }));
    if (c.zone_id && zones.some((z) => z.id === c.zone_id)) setZoneId(c.zone_id);
    setCustQuery("");
    setCustResults([]);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 8);
  }, [products, query]);

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const promoDiscount = promo ? computeDiscount(subtotal, promo.discount_type, promo.discount_value) : 0;
  const manualDiscount = Math.max(0, Number(manual) || 0);
  const discount = Math.round(Math.min(subtotal, promoDiscount + manualDiscount) * 100) / 100;
  const zone = source === "phone" ? zones.find((z) => z.id === zoneId) : undefined;
  const delivery = zone?.delivery_fee ?? 0;
  const total = subtotal - discount + delivery;

  function changeSource(next: Source) {
    setSource(next);
    setMethod(next === "in_store" ? "cash" : "cod");
    setError("");
  }

  function add(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stock_quantity) } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setQuery("");
  }

  function setQty(id: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, Math.min(qty, l.product.stock_quantity)) } : l))
    );
  }

  function applyPromo() {
    setPromoError("");
    if (!promoInput.trim()) return;
    startPromo(async () => {
      const r = await checkAdminPromo(promoInput);
      if (r.ok) {
        setPromo({ code: r.code, discount_type: r.discount_type, discount_value: r.discount_value });
        setPromoInput("");
      } else {
        setPromoError(r.error);
      }
    });
  }

  function submit() {
    setError("");
    if (lines.length === 0) return setError(p.errAddProduct);
    if (source === "phone") {
      if (customer.name.trim().length < 2) return setError(p.errName);
      if (!customer.phone1.trim()) return setError(p.errPhone);
      if (!zoneId) return setError(p.errZone);
      if (customer.address.trim().length < 5) return setError(p.errAddress);
    }
    startSave(async () => {
      const result = await createManualOrder({
        source,
        customer_name: customer.name,
        phone1: customer.phone1,
        phone2: customer.phone2,
        address: customer.address,
        shipping_zone_id: zoneId,
        payment_method: method,
        promo_code: promo?.code ?? "",
        manual_discount: manualDiscount,
        notes: customer.notes,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      // Only reached on failure: success redirects to the receipt.
      if (result?.error) setError(result.error);
    });
  }

  const field = (key: keyof typeof customer) => ({
    value: customer[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCustomer((c) => ({ ...c, [key]: e.target.value })),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={p.orderType}>
          <TypeCard
            active={source === "in_store"}
            onClick={() => changeSource("in_store")}
            icon={<Store className="size-5" />}
            title={p.inStore}
            hint={p.inStoreHint}
          />
          <TypeCard
            active={source === "phone"}
            onClick={() => changeSource("phone")}
            icon={<Phone className="size-5" />}
            title={p.phone}
            hint={p.phoneHint}
          />
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-4">
          <Label htmlFor="pos-search">{p.addProducts}</Label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.searchPlaceholder}
              className="ps-9"
              autoComplete="off"
            />
          </div>
          {query.trim() && (
            <ul className="divide-y rounded-md border">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">{p.noMatch}</li>
              ) : (
                results.map((prod) => {
                  const inCart = lines.find((l) => l.product.id === prod.id)?.quantity ?? 0;
                  const available = prod.stock_quantity - inCart;
                  return (
                    <li key={prod.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Thumb url={prod.image_url} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {prod.name}
                          {!prod.is_active && <span className="ms-2 text-xs text-muted-foreground">{p.hiddenInStore}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(prod.price)} · {t.common.inStock(prod.stock_quantity)}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" disabled={available < 1} onClick={() => add(prod)}>
                        <Plus className="size-4" /> {available < 1 ? p.noStock : t.common.add}
                      </Button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          {lines.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{p.empty}</p>
          ) : (
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-3 p-3 text-sm">
                  <Thumb url={l.product.image_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMoney(l.product.price)} {t.common.each} · {t.common.inStock(l.product.stock_quantity)}
                    </div>
                  </div>
                  <div className="inline-flex items-center rounded-lg border">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.decrease(l.product.name)} disabled={l.quantity <= 1} onClick={() => setQty(l.product.id, l.quantity - 1)}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center tabular-nums">{l.quantity}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.common.increase(l.product.name)} disabled={l.quantity >= l.product.stock_quantity} onClick={() => setQty(l.product.id, l.quantity + 1)}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <span className="w-20 text-end font-medium tabular-nums">{formatMoney(l.product.price * l.quantity)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={p.remove(l.product.name)}
                    onClick={() => setLines((prev) => prev.filter((x) => x.product.id !== l.product.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="h-fit space-y-5 rounded-lg border bg-card p-5 xl:sticky xl:top-6">
        <div className="space-y-3">
          <h2 className="font-medium">{t.common.customer}</h2>
          <div className="relative space-y-2">
            <Label htmlFor="pos-customer-search">{p.existingCustomer}</Label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pos-customer-search"
                value={custQuery}
                onChange={(e) => findCustomers(e.target.value)}
                placeholder={p.customerSearch}
                className="ps-9"
                autoComplete="off"
              />
            </div>
            {custQuery.trim().length >= 2 && (
              <ul className="absolute z-10 w-full divide-y rounded-md border bg-popover text-sm shadow-md">
                {custResults.length === 0 ? (
                  <li className="px-3 py-2 text-muted-foreground">{searchingCust ? t.common.searching : p.noCustomers}</li>
                ) : (
                  custResults.map((c) => (
                    <li key={c.phone_key}>
                      <button type="button" onClick={() => pickCustomer(c)} className="w-full px-3 py-2 text-start hover:bg-muted">
                        <span className="font-medium">{c.customer_name}</span>
                        <span className="ms-2 text-muted-foreground tabular-nums" dir="ltr">{c.phone}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.zone_name ?? p.noZone} · {p.ordersCount(Number(c.orders_count))}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-name">{t.common.name}{source === "in_store" && <span className="text-muted-foreground"> {t.common.optional}</span>}</Label>
            <Input id="pos-name" placeholder={source === "in_store" ? p.walkIn : ""} {...field("name")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pos-phone1">{t.common.phone}{source === "in_store" && <span className="text-muted-foreground"> {t.common.optional}</span>}</Label>
              <Input id="pos-phone1" type="tel" dir="ltr" {...field("phone1")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-phone2">
                {p.secondPhone} <span className="text-muted-foreground">{t.common.optional}</span>
              </Label>
              <Input id="pos-phone2" type="tel" dir="ltr" {...field("phone2")} />
            </div>
          </div>
          {source === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="pos-zone">{p.deliveryZone}</Label>
              <select id="pos-zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={selectClass}>
                <option value="">{p.chooseZone}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zone_name} ({formatMoney(z.delivery_fee)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pos-address">
              {t.common.address}{source === "in_store" && <span className="text-muted-foreground"> {t.common.optional}</span>}
            </Label>
            <Textarea id="pos-address" rows={2} {...field("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-notes">
              {t.common.notes} <span className="text-muted-foreground">{t.common.optional}</span>
            </Label>
            <Textarea id="pos-notes" rows={2} {...field("notes")} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{p.paymentMethod}</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS[source].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  method === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {t.paymentMethod[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="pos-promo">{p.promoCode}</Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
                <span className="flex items-center gap-2">
                  <Tag className="size-4" />
                  <span className="font-semibold">{promo.code}</span>
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={p.removePromo} onClick={() => setPromo(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="pos-promo"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyPromo();
                    }
                  }}
                  className="uppercase"
                  autoComplete="off"
                />
                <Button type="button" variant="outline" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()}>
                  {checkingPromo ? "…" : p.apply}
                </Button>
              </div>
            )}
            {promoError && <p className="text-sm text-destructive">{promoError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-manual">{p.manualDiscount}</Label>
            <Input id="pos-manual" inputMode="decimal" placeholder="0.00" value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
        </div>

        <dl className="space-y-1 border-t pt-4 text-sm">
          <Row label={t.common.subtotal} value={formatMoney(subtotal)} />
          {promoDiscount > 0 && <Row label={p.promoRow(promo?.code ?? "")} value={`−${formatMoney(Math.min(promoDiscount, subtotal))}`} />}
          {manualDiscount > 0 && <Row label={p.manualDiscountRow} value={`−${formatMoney(Math.min(manualDiscount, subtotal))}`} />}
          {source === "phone" && <Row label={p.delivery} value={zone ? formatMoney(delivery) : "—"} />}
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>{t.common.total}</dt>
            <dd className="tabular-nums">{formatMoney(total)}</dd>
          </div>
          {discount >= subtotal && subtotal > 0 && (
            <p className="text-xs text-muted-foreground">{p.capped}</p>
          )}
        </dl>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">
            {error}
          </p>
        )}

        <Button type="button" size="lg" className="w-full" onClick={submit} disabled={saving || lines.length === 0}>
          {saving ? t.common.saving : source === "in_store" ? p.completeSale(formatMoney(total)) : p.createOrder}
        </Button>
        <p className="text-xs text-muted-foreground">
          {p.footnote}
        </p>
      </aside>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-lg border-2 p-4 text-start transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
