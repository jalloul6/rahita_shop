"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { processReturn } from "@/app/(admin)/admin/orders/actions";
import { ShippingToggle } from "@/components/admin/exchange-panel";
import { formatMoney } from "@/lib/format";
import { useAdminT } from "@/lib/i18n/admin-client";

type Item = { id: string; product_name: string; quantity: number; returned_quantity: number; unit_price: number };

export function ReturnPanel({
  orderId,
  items,
  maxRefund,
  discountRatio,
  shippingFee,
  shippingRefunded,
}: {
  orderId: string;
  items: Item[];
  maxRefund: number; // order total minus what was already refunded
  discountRatio: number; // share of the subtotal that was discounted, so refunds match what was paid
  shippingFee: number;
  shippingRefunded: boolean;
}) {
  const { t } = useAdminT();
  const r = t.returns;
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<string | null>(null); // null = follow the suggestion
  const [refundShipping, setRefundShipping] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();

  const returnable = items.filter((i) => i.quantity > i.returned_quantity);
  const shipping = refundShipping && shippingFee > 0 && !shippingRefunded ? shippingFee : 0;
  const itemsMax = Math.max(0, maxRefund - shipping);
  const suggested =
    Math.round(
      Math.min(itemsMax, returnable.reduce((sum, i) => sum + (qty[i.id] ?? 0) * i.unit_price * (1 - discountRatio), 0)) * 100
    ) / 100;
  const refundValue = refund === null ? suggested : Number(refund) || 0;
  const totalRefund = Math.round((refundValue + shipping) * 100) / 100;
  const selected = returnable.reduce((n, i) => n + (qty[i.id] ?? 0), 0);

  if (returnable.length === 0) return null;

  function set(id: string, value: number, max: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, value)) }));
  }

  function submit() {
    setMessage({});
    if (selected === 0) return setMessage({ error: r.chooseItem });
    if (refundValue < 0 || totalRefund > maxRefund) {
      return setMessage({ error: r.rangeError(formatMoney(maxRefund)) });
    }
    const confirmText = r.confirm(selected, formatMoney(totalRefund), shipping > 0, restock);
    if (!window.confirm(confirmText)) return;

    start(async () => {
      const result = await processReturn({
        orderId,
        items: returnable
          .filter((i) => (qty[i.id] ?? 0) > 0)
          .map((i) => ({ order_item_id: i.id, quantity: qty[i.id] })),
        restock,
        refundAmount: refundValue,
        reason,
        refundShipping: shipping > 0,
      });
      setMessage(result);
      if (result.success) {
        setQty({});
        setReason("");
        setRefund(null);
        setRefundShipping(false);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <RotateCcw className="size-4" />
          {r.button}
        </Button>
        {message.success && <p className="text-sm text-green-700">{message.success}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{r.title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setQty(Object.fromEntries(returnable.map((i) => [i.id, i.quantity - i.returned_quantity])))}
        >
          {r.everything}
        </Button>
      </div>

      <ul className="divide-y rounded-md border bg-card">
        {returnable.map((i) => {
          const max = i.quantity - i.returned_quantity;
          const value = qty[i.id] ?? 0;
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{i.product_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.soldLine(formatMoney(i.unit_price), i.quantity, i.returned_quantity)}
                </div>
              </div>
              <div className="inline-flex items-center rounded-lg border bg-background">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={r.fewer} disabled={value <= 0} onClick={() => set(i.id, value - 1, max)}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center tabular-nums">
                  {value}/{max}
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={r.more} disabled={value >= max} onClick={() => set(i.id, value + 1, max)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={restock}
          onChange={(e) => setRestock(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block font-medium">{r.restock}</span>
          <span className="block text-xs text-muted-foreground">{r.restockHint}</span>
        </span>
      </label>

      <ShippingToggle fee={shippingFee} refunded={shippingRefunded} checked={refundShipping} onChange={setRefundShipping} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="refund-amount">{r.itemsRefund}</Label>
          <Input
            id="refund-amount"
            inputMode="decimal"
            value={refund ?? suggested.toFixed(2)}
            onChange={(e) => setRefund(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {r.suggestion(formatMoney(itemsMax))}
            {shipping > 0 && r.plusShipping(formatMoney(shipping), formatMoney(totalRefund))}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="return-reason">
            {r.reason} <span className="text-muted-foreground">{t.common.optional}</span>
          </Label>
          <Textarea id="return-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>

      {message.error && (
        <p role="alert" className="text-sm text-destructive">
          {message.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending || selected === 0}>
          {pending ? t.common.saving : r.submit(formatMoney(totalRefund))}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
