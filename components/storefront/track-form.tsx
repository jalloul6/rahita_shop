"use client";

import { useActionState } from "react";
import { Check, MessageCircle, PackageSearch, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder, type TrackState } from "@/app/(storefront)/track/actions";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useShopContact } from "@/lib/shop-context";
import { cn } from "@/lib/utils";
import type { OrderStatus, TrackResult } from "@/types/database";

const FLOW: OrderStatus[] = ["pending", "processing", "out_for_delivery", "delivered"];

export function TrackForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, {});

  return (
    <div className="space-y-6">
      <form action={action} className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="track-ref">{t.track.ref}</Label>
          <Input
            id="track-ref"
            name="ref"
            required
            dir="ltr"
            placeholder={t.track.refPlaceholder}
            defaultValue={state.ref ?? ""}
            autoComplete="off"
            className="uppercase placeholder:normal-case"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="track-phone">{t.track.phone}</Label>
          <Input id="track-phone" name="phone" type="tel" required dir="ltr" defaultValue={state.phone ?? ""} autoComplete="tel" />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          <PackageSearch className="size-4" />
          {pending ? t.track.searching : t.track.submit}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {state.order && <TrackResultCard order={state.order} />}
    </div>
  );
}

function TrackResultCard({ order }: { order: TrackResult }) {
  const { t, locale } = useI18n();
  const { whatsappLink } = useShopContact();
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-LB-u-nu-latn" : "en-GB", { dateStyle: "long" }).format(
    new Date(order.created_at)
  );
  const final = order.status === "canceled" || order.status === "returned";
  const current = order.status === "partially_returned" ? FLOW.length - 1 : FLOW.indexOf(order.status);

  return (
    <section aria-live="polite" className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-heading text-2xl font-semibold" dir="ltr">
            {order.ref}
          </div>
          <div className="text-sm text-muted-foreground">
            {t.track.placed} {date}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            final ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"
          )}
        >
          {t.track.statuses[order.status]}
        </span>
      </div>

      {order.order_source === "in_store" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="size-4" /> {t.track.inStore}
        </p>
      ) : final ? (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm">
          {order.status === "canceled" ? t.track.canceledNote : t.track.returnedNote}
        </p>
      ) : (
        <ol className="flex items-start" aria-label={t.track.title}>
          {FLOW.map((step, i) => {
            const done = i < current || (i === current && order.status !== "pending" && i === FLOW.length - 1);
            const active = i === current && !done;
            return (
              <li key={step} className="flex flex-1 flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
                <div className="flex w-full items-center">
                  <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-primary" : "bg-border")} />
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-primary bg-background text-primary",
                      !done && !active && "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </div>
                  <div className={cn("h-0.5 flex-1", i === FLOW.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-border")} />
                </div>
                <span className={cn("text-xs sm:text-sm", active || done ? "font-medium" : "text-muted-foreground")}>
                  {t.track.statuses[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {order.status === "partially_returned" && <p className="text-sm text-muted-foreground">{t.track.partialNote}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t.track.items}</h2>
          <ul className="divide-y rounded-xl border text-sm">
            {order.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  {item.quantity} × {item.name}
                  {item.returned_quantity > 0 && (
                    <span className="block text-xs text-muted-foreground">{t.track.returnedQty(item.returned_quantity)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="h-fit space-y-1 rounded-xl border p-3 text-sm">
          <Row label={t.track.subtotal} value={formatMoney(order.subtotal)} />
          {order.discount_amount > 0 && <Row label={t.track.discount} value={`−${formatMoney(order.discount_amount)}`} />}
          {order.order_source !== "in_store" && <Row label={t.track.delivery} value={formatMoney(order.shipping_fee)} />}
          <Row label={t.track.total} value={formatMoney(order.total_amount)} strong />
          {order.refunded_amount > 0 && <Row label={t.track.refunded} value={`−${formatMoney(order.refunded_amount)}`} />}
          <div className="flex justify-between border-t pt-2">
            <dt className="text-muted-foreground">{t.track.payment}</dt>
            <dd>
              {t.track.methods[order.payment_method]} · {order.payment_status === "paid" ? t.track.paid : t.track.unpaid}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
        <span className="text-muted-foreground">{t.track.help}</span>
        <a
          href={whatsappLink(t.track.whatsappMessage(order.ref))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 font-semibold text-white hover:bg-[#1ebe5b]"
        >
          <MessageCircle className="size-4" />
          {t.track.whatsapp}
        </a>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "pt-1 text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
