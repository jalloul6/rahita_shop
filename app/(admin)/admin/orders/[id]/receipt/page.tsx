import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/admin/print-button";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { SHOP_NAME, SHOP_PHONE, SHOP_TAGLINE } from "@/lib/shop";
import { statusLabel } from "@/lib/orders";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage(props: PageProps<"/admin/orders/[id]/receipt">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading receipt…</p>}>
      <Receipt params={props.params} />
    </Suspense>
  );
}

async function Receipt({ params }: { params: PageProps<"/admin/orders/[id]/receipt">["params"] }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Page margin for the printer; the admin sidebar is hidden in the layout via print:hidden */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="space-y-5 rounded-lg border-2 border-black bg-white p-6 text-black print:rounded-none print:border-2">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <div className="text-2xl font-bold">{SHOP_NAME}</div>
            <div className="text-sm">{SHOP_TAGLINE}</div>
            {SHOP_PHONE && <div className="text-sm">{SHOP_PHONE}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide">Order</div>
            <div className="text-3xl font-bold tabular-nums">#{order.order_number}</div>
            <div className="text-xs">{formatDateTime(order.created_at)}</div>
          </div>
        </header>

        <section>
          <div className="text-xs font-semibold uppercase tracking-wide">Deliver to</div>
          <div className="mt-1 text-xl font-bold">{order.customer_name}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {order.phone1}
            {order.phone2 && <span> &nbsp;/&nbsp; {order.phone2}</span>}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-base">{order.address}</div>
          <div className="mt-2 inline-block rounded border border-black px-2 py-0.5 text-sm font-semibold">
            Zone: {order.shipping_zones?.zone_name ?? "—"}
          </div>
        </section>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-black text-left">
                <th className="py-1.5">Item</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Price</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-300">
                  <td className="py-1.5">{item.product_name}</td>
                  <td className="py-1.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(item.unit_price)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-2 ml-auto w-56 space-y-0.5 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd className="tabular-nums">{formatMoney(order.shipping_fee)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded border-2 border-black p-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide">Cash on delivery: collect</div>
          <div className="text-4xl font-extrabold tabular-nums">{formatMoney(order.total_amount)}</div>
        </section>

        {order.notes && (
          <section className="text-sm">
            <span className="font-semibold">Notes: </span>
            <span className="whitespace-pre-wrap">{order.notes}</span>
          </section>
        )}

        <footer className="flex justify-between border-t border-black pt-3 text-xs">
          <span>Status: {statusLabel(order.status)}</span>
          <span>Thank you for shopping with {SHOP_NAME}</span>
        </footer>
      </article>
    </div>
  );
}
