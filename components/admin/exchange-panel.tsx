"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeftRight, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { processExchange } from "@/app/(admin)/admin/orders/actions";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = { id: string; product_name: string; quantity: number; returned_quantity: number; unit_price: number };
type Product = { id: string; name: string; price: number; stock_quantity: number };
type ReturnLine = { qty: number; restock: boolean; reason: string };

const round = (n: number) => Math.round(n * 100) / 100;

export function ExchangePanel({
  orderId,
  items,
  products,
  shippingFee,
  shippingRefunded,
}: {
  orderId: string;
  items: Item[];
  products: Product[];
  shippingFee: number;
  shippingRefunded: boolean;
}) {
  const returnable = items.filter((i) => i.quantity > i.returned_quantity);
  const [open, setOpen] = useState(false);
  const [returns, setReturns] = useState<Record<string, ReturnLine>>({});
  const [newItems, setNewItems] = useState<{ product: Product; qty: number }[]>([]);
  const [search, setSearch] = useState("");
  const [refundShipping, setRefundShipping] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, search]);

  const line = (id: string): ReturnLine => returns[id] ?? { qty: 0, restock: true, reason: "" };
  const setLine = (id: string, patch: Partial<ReturnLine>) => setReturns((r) => ({ ...r, [id]: { ...line(id), ...patch } }));

  const returnedValue = round(returnable.reduce((sum, i) => sum + line(i.id).qty * i.unit_price, 0));
  const newValue = round(newItems.reduce((sum, n) => sum + n.qty * n.product.price, 0));
  const canRefundShipping = shippingFee > 0 && !shippingRefunded;
  const shipping = refundShipping && canRefundShipping ? shippingFee : 0;
  const diff = round(newValue - returnedValue - shipping);
  const returnedCount = returnable.reduce((n, i) => n + line(i.id).qty, 0);

  if (returnable.length === 0) return null;

  function addProduct(p: Product) {
    setNewItems((prev) => {
      const existing = prev.find((n) => n.product.id === p.id);
      if (existing) return prev.map((n) => (n.product.id === p.id ? { ...n, qty: Math.min(n.qty + 1, p.stock_quantity) } : n));
      return [...prev, { product: p, qty: 1 }];
    });
    setSearch("");
  }

  function submit() {
    setMessage({});
    if (returnedCount === 0) return setMessage({ error: "Choose at least one item the customer is returning." });
    if (newItems.length === 0) return setMessage({ error: "Add at least one replacement item." });
    const money = diff > 0 ? `Collect ${formatMoney(diff)}` : diff < 0 ? `Refund ${formatMoney(-diff)}` : "No price difference";
    if (!window.confirm(`Exchange ${returnedCount} item(s) for ${newItems.reduce((n, x) => n + x.qty, 0)} new item(s)? ${money}.`)) return;

    start(async () => {
      const result = await processExchange({
        orderId,
        returns: returnable
          .filter((i) => line(i.id).qty > 0)
          .map((i) => ({ order_item_id: i.id, quantity: line(i.id).qty, restock: line(i.id).restock, reason: line(i.id).reason })),
        newItems: newItems.map((n) => ({ product_id: n.product.id, quantity: n.qty })),
        refundShipping: refundShipping && canRefundShipping,
        note,
      });
      setMessage(result);
      if (result.success) {
        setOpen(false);
        setReturns({});
        setNewItems([]);
        setRefundShipping(false);
        setNote("");
      }
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ArrowLeftRight className="size-4" />
          Exchange Item
        </Button>
        {message.success && <p className="text-sm text-green-700">{message.success}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <h3 className="font-medium">Exchange items</h3>

      <div className="space-y-2">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer returns</div>
        <ul className="divide-y rounded-md border bg-card">
          {returnable.map((i) => {
            const l = line(i.id);
            const max = i.quantity - i.returned_quantity;
            return (
              <li key={i.id} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{i.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatMoney(i.unit_price)} each · {max} can be exchanged
                    </div>
                  </div>
                  <Qty value={l.qty} min={0} max={max} onChange={(qty) => setLine(i.id, { qty })} label={`${i.product_name} returned`} />
                </div>
                {l.qty > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={l.restock} onChange={(e) => setLine(i.id, { restock: e.target.checked })} className="size-4 accent-primary" />
                      Restock
                    </label>
                    <Input
                      value={l.reason}
                      onChange={(e) => setLine(i.id, { reason: e.target.value })}
                      placeholder="Reason (optional), e.g. wrong size, damaged"
                      className="h-8 min-w-48 flex-1"
                      aria-label={`Reason for returning ${i.product_name}`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer receives</div>
        <div className="relative">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products to add…" aria-label="Search replacement products" />
          {search.trim() && (
            <ul className="absolute z-10 mt-1 w-full divide-y rounded-md border bg-popover text-sm shadow-md">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground">No products in stock match.</li>
              ) : (
                results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addProduct(p)} className="flex w-full justify-between gap-2 px-3 py-2 text-left hover:bg-muted">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatMoney(p.price)} · {p.stock_quantity} in stock
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {newItems.length > 0 && (
          <ul className="divide-y rounded-md border bg-card">
            {newItems.map((n) => (
              <li key={n.product.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{n.product.name}</div>
                  <div className="text-xs text-muted-foreground">{formatMoney(n.product.price)} each</div>
                </div>
                <Qty
                  value={n.qty}
                  min={1}
                  max={n.product.stock_quantity}
                  label={`${n.product.name} given`}
                  onChange={(qty) => setNewItems((prev) => prev.map((x) => (x.product.id === n.product.id ? { ...x, qty } : x)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Remove ${n.product.name}`}
                  onClick={() => setNewItems((prev) => prev.filter((x) => x.product.id !== n.product.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ShippingToggle fee={shippingFee} refunded={shippingRefunded} checked={refundShipping} onChange={setRefundShipping} />

      <dl className="space-y-1 rounded-md border bg-card p-3 text-sm">
        <Row label="Returned value" value={formatMoney(returnedValue)} />
        <Row label="Replacement value" value={formatMoney(newValue)} />
        {shipping > 0 && <Row label="Shipping refund" value={`−${formatMoney(shipping)}`} />}
        <div
          className={cn(
            "flex justify-between border-t pt-2 text-base font-semibold",
            diff > 0 && "text-amber-700",
            diff < 0 && "text-rose-700",
            diff === 0 && "text-green-700"
          )}
        >
          <dt>{diff > 0 ? "Amount to collect" : diff < 0 ? "Amount to refund" : "Price difference"}</dt>
          <dd className="tabular-nums">{formatMoney(Math.abs(diff))}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <Label htmlFor="exchange-note">
          Note <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="exchange-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {message.error && (
        <p role="alert" className="text-sm text-destructive">
          {message.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending || returnedCount === 0 || newItems.length === 0}>
          {pending ? "Saving…" : "Confirm exchange"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Shared with the Return / Refund panel.
export function ShippingToggle({
  fee,
  refunded,
  checked,
  onChange,
}: {
  fee: number;
  refunded: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  if (fee <= 0) return null;
  return (
    <label className={cn("flex items-start gap-3 text-sm", refunded && "opacity-60")}>
      <input
        type="checkbox"
        checked={checked && !refunded}
        disabled={refunded}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="block font-medium">Refund shipping · Delivery {formatMoney(fee)}</span>
        <span className="block text-xs text-muted-foreground">
          {refunded ? "Shipping was already refunded on this order." : "Give the customer their delivery fee back too."}
        </span>
      </span>
    </label>
  );
}

function Qty({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-background">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" />
      </Button>
      <span className="w-12 text-center tabular-nums">
        {value}/{max}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" />
      </Button>
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
