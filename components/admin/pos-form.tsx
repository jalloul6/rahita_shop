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

const METHODS: Record<Source, { value: PaymentMethod; label: string }[]> = {
  in_store: [
    { value: "cash", label: "Cash" },
    { value: "whish", label: "Whish Money" },
  ],
  phone: [
    { value: "cod", label: "Cash on Delivery" },
    { value: "whish", label: "Whish Money" },
    { value: "cash", label: "Cash" },
  ],
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PosForm({ products, zones }: { products: Product[]; zones: Zone[] }) {
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
    if (lines.length === 0) return setError("Add at least one product.");
    if (source === "phone") {
      if (customer.name.trim().length < 2) return setError("Enter the customer's name.");
      if (!customer.phone1.trim()) return setError("Enter the customer's phone number.");
      if (!zoneId) return setError("Choose a delivery zone.");
      if (customer.address.trim().length < 5) return setError("Enter the delivery address.");
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
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Order type">
          <TypeCard
            active={source === "in_store"}
            onClick={() => changeSource("in_store")}
            icon={<Store className="size-5" />}
            title="In-Store Sale"
            hint="No delivery. Saved as Delivered & Paid."
          />
          <TypeCard
            active={source === "phone"}
            onClick={() => changeSource("phone")}
            icon={<Phone className="size-5" />}
            title="Phone / WhatsApp Delivery"
            hint="Customer details, zone and address. Starts as Pending."
          />
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-4">
          <Label htmlFor="pos-search">Add products</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name or category…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {query.trim() && (
            <ul className="divide-y rounded-md border">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No products match.</li>
              ) : (
                results.map((p) => {
                  const inCart = lines.find((l) => l.product.id === p.id)?.quantity ?? 0;
                  const available = p.stock_quantity - inCart;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Thumb url={p.image_url} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {p.name}
                          {!p.is_active && <span className="ml-2 text-xs text-muted-foreground">(hidden in store)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(p.price)} · {p.stock_quantity} in stock
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" disabled={available < 1} onClick={() => add(p)}>
                        <Plus className="size-4" /> {available < 1 ? "No stock" : "Add"}
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
            <p className="p-6 text-center text-sm text-muted-foreground">No products yet. Search above to add items.</p>
          ) : (
            <ul className="divide-y">
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-3 p-3 text-sm">
                  <Thumb url={l.product.image_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMoney(l.product.price)} each · {l.product.stock_quantity} in stock
                    </div>
                  </div>
                  <div className="inline-flex items-center rounded-lg border">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Decrease" disabled={l.quantity <= 1} onClick={() => setQty(l.product.id, l.quantity - 1)}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center tabular-nums">{l.quantity}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Increase" disabled={l.quantity >= l.product.stock_quantity} onClick={() => setQty(l.product.id, l.quantity + 1)}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <span className="w-20 text-right font-medium tabular-nums">{formatMoney(l.product.price * l.quantity)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={`Remove ${l.product.name}`}
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
          <h2 className="font-medium">Customer</h2>
          <div className="relative space-y-2">
            <Label htmlFor="pos-customer-search">Existing customer</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pos-customer-search"
                value={custQuery}
                onChange={(e) => findCustomers(e.target.value)}
                placeholder="Search by name or phone…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {custQuery.trim().length >= 2 && (
              <ul className="absolute z-10 w-full divide-y rounded-md border bg-popover text-sm shadow-md">
                {custResults.length === 0 ? (
                  <li className="px-3 py-2 text-muted-foreground">{searchingCust ? "Searching…" : "No matching customers."}</li>
                ) : (
                  custResults.map((c) => (
                    <li key={c.phone_key}>
                      <button type="button" onClick={() => pickCustomer(c)} className="w-full px-3 py-2 text-left hover:bg-muted">
                        <span className="font-medium">{c.customer_name}</span>
                        <span className="ml-2 text-muted-foreground tabular-nums">{c.phone}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.zone_name ?? "No zone"} · {c.orders_count} order{Number(c.orders_count) === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-name">Name{source === "in_store" && <span className="text-muted-foreground"> (optional)</span>}</Label>
            <Input id="pos-name" placeholder={source === "in_store" ? "Walk-in customer" : ""} {...field("name")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pos-phone1">Phone{source === "in_store" && <span className="text-muted-foreground"> (optional)</span>}</Label>
              <Input id="pos-phone1" type="tel" {...field("phone1")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-phone2">
                Second phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="pos-phone2" type="tel" {...field("phone2")} />
            </div>
          </div>
          {source === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="pos-zone">Delivery zone</Label>
              <select id="pos-zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={selectClass}>
                <option value="">Choose a zone…</option>
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
              Address{source === "in_store" && <span className="text-muted-foreground"> (optional)</span>}
            </Label>
            <Textarea id="pos-address" rows={2} {...field("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="pos-notes" rows={2} {...field("notes")} />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Payment method</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS[source].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                aria-pressed={method === m.value}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  method === m.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="pos-promo">Promo code</Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-800">
                <span className="flex items-center gap-2">
                  <Tag className="size-4" />
                  <span className="font-semibold">{promo.code}</span>
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove promo code" onClick={() => setPromo(null)}>
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
                  {checkingPromo ? "…" : "Apply"}
                </Button>
              </div>
            )}
            {promoError && <p className="text-sm text-destructive">{promoError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-manual">Manual discount ($)</Label>
            <Input id="pos-manual" inputMode="decimal" placeholder="0.00" value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
        </div>

        <dl className="space-y-1 border-t pt-4 text-sm">
          <Row label="Subtotal" value={formatMoney(subtotal)} />
          {promoDiscount > 0 && <Row label={`Promo (${promo?.code})`} value={`−${formatMoney(Math.min(promoDiscount, subtotal))}`} />}
          {manualDiscount > 0 && <Row label="Manual discount" value={`−${formatMoney(Math.min(manualDiscount, subtotal))}`} />}
          {source === "phone" && <Row label="Delivery" value={zone ? formatMoney(delivery) : "—"} />}
          <div className="flex justify-between pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(total)}</dd>
          </div>
          {discount >= subtotal && subtotal > 0 && (
            <p className="text-xs text-muted-foreground">Discount is capped at the products subtotal.</p>
          )}
        </dl>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">
            {error}
          </p>
        )}

        <Button type="button" size="lg" className="w-full" onClick={submit} disabled={saving || lines.length === 0}>
          {saving ? "Saving…" : source === "in_store" ? `Complete sale · ${formatMoney(total)}` : "Create order"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Stock is deducted immediately. Prices and discounts are recalculated on save; the receipt opens next.
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
        "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
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
