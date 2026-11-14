import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/admin/print-button";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { SHOP_NAME, SHOP_PHONE, SHOP_TAGLINE } from "@/lib/shop";
import { PAYMENT_METHOD_LABELS, exchangeMoney, orderRef, statusLabel } from "@/lib/orders";

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
  const inStore = order.order_source === "in_store";
  const itemNames = new Map(order.order_items.map((i) => [i.id, i.product_name]));
  // Lines are listed as sold; exchanged-out units are credited back so the subtotal adds up.
  const itemsTotal = order.order_items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const hasExchanges = order.order_exchanges.length > 0 || order.order_exchange_batches.length > 0;
  const exchangeCredit = hasExchanges ? Math.round((itemsTotal - order.subtotal) * 100) / 100 : 0;

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
            <div className="text-3xl font-bold tabular-nums">{orderRef(order.order_number)}</div>
            <div className="text-xs">{formatDateTime(order.created_at)}</div>
          </div>
        </header>

        {inStore && (
          <div className="rounded bg-black py-2 text-center text-lg font-extrabold tracking-[0.3em] text-white print:[print-color-adjust:exact]">
            IN-STORE SALE
          </div>
        )}

        <section>
          <div className="text-xs font-semibold uppercase tracking-wide">{inStore ? "Customer" : "Deliver to"}</div>
          <div className="mt-1 text-xl font-bold">{order.customer_name}</div>
          {(order.phone1 || order.phone2) && (
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {order.phone1}
              {order.phone2 && <span> &nbsp;/&nbsp; {order.phone2}</span>}
            </div>
          )}
          {order.address && <div className="mt-2 whitespace-pre-wrap text-base">{order.address}</div>}
          {!inStore && (
            <div className="mt-2 inline-block rounded border border-black px-2 py-0.5 text-sm font-semibold">
              Zone: {order.shipping_zones?.zone_name ?? "—"}
            </div>
          )}
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
                  <td className="py-1.5">
                    {item.product_name}
                    {item.from_exchange && <span className="text-xs"> (exchange)</span>}
                    {item.returned_quantity > 0 && <span className="text-xs"> ({item.returned_quantity} returned/exchanged)</span>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(item.unit_price)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-2 ml-auto w-64 space-y-0.5 text-sm">
            {exchangeCredit > 0 && (
              <>
                <div className="flex justify-between">
                  <dt>Items</dt>
                  <dd className="tabular-nums">{formatMoney(itemsTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Exchanged items returned</dt>
                  <dd className="tabular-nums">−{formatMoney(exchangeCredit)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <dt>Discount{order.promo_code ? ` (${order.promo_code})` : ""}</dt>
                <dd className="tabular-nums">−{formatMoney(order.discount_amount)}</dd>
              </div>
            )}
            {!inStore && (
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{formatMoney(order.shipping_fee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-0.5 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.total_amount)}</dd>
            </div>
            {order.refunded_amount > 0 && (
              <>
                <div className="flex justify-between">
                  <dt>Refunded</dt>
                  <dd className="tabular-nums">−{formatMoney(order.refunded_amount)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Net amount</dt>
                  <dd className="tabular-nums">{formatMoney(order.total_amount - order.refunded_amount)}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {order.order_exchange_batches.length > 0 && (
          <section className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide">Exchanges</div>
            {[...order.order_exchange_batches]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((b) => (
                <div key={b.id} className="flex justify-between gap-4 border-b border-neutral-300 py-1">
                  <span>
                    {formatDateTime(b.created_at)}:{" "}
                    {b.order_exchange_lines
                      .filter((l) => l.direction === "returned")
                      .map((l) => `${l.quantity} × ${l.product_name}${l.reason ? ` (${l.reason})` : ""}`)
                      .join(", ")}{" "}
                    →{" "}
                    {b.order_exchange_lines
                      .filter((l) => l.direction === "new")
                      .map((l) => `${l.quantity} × ${l.product_name}`)
                      .join(", ")}
                    {b.shipping_refund > 0 ? ` · shipping refunded ${formatMoney(b.shipping_refund)}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">{exchangeMoney(b.price_difference)}</span>
                </div>
              ))}
          </section>
        )}

        {order.order_exchanges.length > 0 && (
          <section className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide">Earlier exchanges</div>
            {[...order.order_exchanges]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((x) => (
                <div key={x.id} className="flex justify-between gap-4 border-b border-neutral-300 py-1">
                  <span>
                    {formatDateTime(x.created_at)}: {x.returned_quantity} × {x.returned_product_name} → {x.new_quantity} ×{" "}
                    {x.new_product_name}
                    {x.reason ? ` (${x.reason})` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">{exchangeMoney(x.price_difference)}</span>
                </div>
              ))}
          </section>
        )}

        {order.order_returns.length > 0 && (
          <section className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide">Returns</div>
            {[...order.order_returns]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((r) => (
                <div key={r.id} className="flex justify-between gap-4 border-b border-neutral-300 py-1">
                  <span>
                    {formatDateTime(r.created_at)}:{" "}
                    {r.order_return_items.map((ri) => `${ri.quantity} × ${itemNames.get(ri.order_item_id) ?? "Item"}`).join(", ")}
                    {r.reason ? ` (${r.reason})` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">−{formatMoney(r.refund_amount)}</span>
                </div>
              ))}
          </section>
        )}

        <section className="rounded border-2 border-black p-3 text-center">
          {inStore ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide">
                {order.payment_status === "paid" ? "Paid in store" : "Payment pending"} · {PAYMENT_METHOD_LABELS[order.payment_method]}
              </div>
              <div className="text-4xl font-extrabold tabular-nums">
                {formatMoney(order.total_amount - order.refunded_amount)}
              </div>
            </>
          ) : order.payment_status === "paid" ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide">
                Paid via {PAYMENT_METHOD_LABELS[order.payment_method]}: collect
              </div>
              <div className="text-4xl font-extrabold tabular-nums">{formatMoney(0)}</div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide">
                {order.payment_method === "whish" ? "Whish payment NOT confirmed: collect" : "Cash on delivery: collect"}
              </div>
              <div className="text-4xl font-extrabold tabular-nums">{formatMoney(order.total_amount)}</div>
            </>
          )}
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
