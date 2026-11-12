"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { processReturn } from "@/app/(admin)/admin/orders/actions";
import { formatMoney } from "@/lib/format";

type Item = { id: string; product_name: string; quantity: number; returned_quantity: number; unit_price: number };

export function ReturnPanel({
  orderId,
  items,
  maxRefund,
  discountRatio,
}: {
  orderId: string;
  items: Item[];
  maxRefund: number; // order total minus what was already refunded
  discountRatio: number; // share of the subtotal that was discounted, so refunds match what was paid
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<string | null>(null); // null = follow the suggestion
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, start] = useTransition();

  const returnable = items.filter((i) => i.quantity > i.returned_quantity);
  const suggested =
    Math.round(
      Math.min(
        maxRefund,
        returnable.reduce((sum, i) => sum + (qty[i.id] ?? 0) * i.unit_price * (1 - discountRatio), 0)
      ) * 100
    ) / 100;
  const refundValue = refund === null ? suggested : Number(refund) || 0;
  const selected = returnable.reduce((n, i) => n + (qty[i.id] ?? 0), 0);

  if (returnable.length === 0) return null;

  function set(id: string, value: number, max: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, value)) }));
  }

  function submit() {
    setMessage({});
    if (selected === 0) return setMessage({ error: "Choose at least one item to return." });
    if (refundValue < 0 || refundValue > maxRefund) {
      return setMessage({ error: `Refund must be between ${formatMoney(0)} and ${formatMoney(maxRefund)}.` });
    }
    const confirmText = `Return ${selected} item(s) and refund ${formatMoney(refundValue)}?${
      restock ? " Items go back into stock." : " Items will NOT be restocked."
    } This cannot be undone.`;
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
      });
      setMessage(result);
      if (result.success) {
        setQty({});
        setReason("");
        setRefund(null);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <RotateCcw className="size-4" />
          Return / Refund
        </Button>
        {message.success && <p className="text-sm text-green-700">{message.success}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Return / Refund</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setQty(Object.fromEntries(returnable.map((i) => [i.id, i.quantity - i.returned_quantity])))}
        >
          Return everything
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
                  {formatMoney(i.unit_price)} each · {i.quantity} sold
                  {i.returned_quantity > 0 && ` · ${i.returned_quantity} already returned`}
                </div>
              </div>
              <div className="inline-flex items-center rounded-lg border bg-background">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Fewer" disabled={value <= 0} onClick={() => set(i.id, value - 1, max)}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center tabular-nums">
                  {value}/{max}
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="More" disabled={value >= max} onClick={() => set(i.id, value + 1, max)}>
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
          <span className="block font-medium">Restock returned items</span>
          <span className="block text-xs text-muted-foreground">Untick if the items are damaged and can&apos;t be sold again.</span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="refund-amount">Refund to customer ($)</Label>
          <Input
            id="refund-amount"
            inputMode="decimal"
            value={refund ?? suggested.toFixed(2)}
            onChange={(e) => setRefund(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Suggested from returned items (after discount). Max {formatMoney(maxRefund)}. Use 0 for exchanges.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="return-reason">
            Reason <span className="text-muted-foreground">(optional)</span>
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
          {pending ? "Saving…" : `Confirm return · refund ${formatMoney(refundValue)}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
