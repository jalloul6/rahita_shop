import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/admin/print-button";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { SHOP_PHONE } from "@/lib/shop";
import { getShopSettings } from "@/lib/data/storefront";
import { getAdminLocale } from "@/lib/i18n/admin-server";
import { brandFor } from "@/lib/settings";
import { orderRef } from "@/lib/orders";
import { getAdminT } from "@/lib/i18n/admin-server";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage(props: PageProps<"/admin/orders/[id]/receipt">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Receipt params={props.params} />
    </Suspense>
  );
}

async function Receipt({ params }: { params: PageProps<"/admin/orders/[id]/receipt">["params"] }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const [t, locale, settings] = await Promise.all([getAdminT(), getAdminLocale(), getShopSettings()]);
  const brand = brandFor(settings, locale);
  const r = t.receipt;
  const exchangeMoney = t.exchangeMoney;
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
            <div className="text-2xl font-bold">{brand.name}</div>
            <div className="text-sm">{brand.tagline}</div>
            {SHOP_PHONE && <div className="text-sm">{SHOP_PHONE}</div>}
          </div>
          <div className="text-end">
            <div className="text-xs uppercase tracking-wide">{r.order}</div>
            <div className="text-3xl font-bold tabular-nums">{orderRef(order.order_number)}</div>
            <div className="text-xs">{formatDateTime(order.created_at)}</div>
          </div>
        </header>

        {inStore && (
          <div className="rounded bg-black py-2 text-center text-lg font-extrabold tracking-[0.3em] text-white print:[print-color-adjust:exact]">
            {r.inStoreSale}
          </div>
        )}

        <section>
          <div className="text-xs font-semibold uppercase tracking-wide">{inStore ? t.common.customer : r.deliverTo}</div>
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
              {t.common.zone}: {order.shipping_zones?.zone_name ?? "—"}
            </div>
          )}
        </section>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-black text-start">
                <th className="py-1.5">{t.common.item}</th>
                <th className="py-1.5 text-end">{t.common.qty}</th>
                <th className="py-1.5 text-end">{t.common.price}</th>
                <th className="py-1.5 text-end">{t.common.total}</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-300">
                  <td className="py-1.5">
                    {item.product_name}
                    {item.from_exchange && <span className="text-xs"> {r.exchangeTag}</span>}
                    {item.returned_quantity > 0 && <span className="text-xs"> {r.returnedTag(item.returned_quantity)}</span>}
                  </td>
                  <td className="py-1.5 text-end tabular-nums">{item.quantity}</td>
                  <td className="py-1.5 text-end tabular-nums">{formatMoney(item.unit_price)}</td>
                  <td className="py-1.5 text-end tabular-nums">{formatMoney(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-2 ms-auto w-64 space-y-0.5 text-sm">
            {exchangeCredit > 0 && (
              <>
                <div className="flex justify-between">
                  <dt>{r.items}</dt>
                  <dd className="tabular-nums">{formatMoney(itemsTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{r.exchangedBack}</dt>
                  <dd className="tabular-nums">−{formatMoney(exchangeCredit)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <dt>{t.common.subtotal}</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <dt>{t.common.discount}{order.promo_code ? ` (${order.promo_code})` : ""}</dt>
                <dd className="tabular-nums">−{formatMoney(order.discount_amount)}</dd>
              </div>
            )}
            {!inStore && (
              <div className="flex justify-between">
                <dt>{t.common.shipping}</dt>
                <dd className="tabular-nums">{formatMoney(order.shipping_fee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-0.5 font-semibold">
              <dt>{t.common.total}</dt>
              <dd className="tabular-nums">{formatMoney(order.total_amount)}</dd>
            </div>
            {order.refunded_amount > 0 && (
              <>
                <div className="flex justify-between">
                  <dt>{t.common.refunded}</dt>
                  <dd className="tabular-nums">−{formatMoney(order.refunded_amount)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>{t.common.netAmount}</dt>
                  <dd className="tabular-nums">{formatMoney(order.total_amount - order.refunded_amount)}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {order.order_exchange_batches.length > 0 && (
          <section className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide">{r.exchanges}</div>
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
                    {b.shipping_refund > 0 ? r.shippingRefunded(formatMoney(b.shipping_refund)) : ""}
                  </span>
                  <span className="shrink-0 tabular-nums">{exchangeMoney(b.price_difference)}</span>
                </div>
              ))}
          </section>
        )}

        {order.order_exchanges.length > 0 && (
          <section className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide">{r.earlierExchanges}</div>
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
            <div className="text-xs font-semibold uppercase tracking-wide">{r.returns}</div>
            {[...order.order_returns]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((r) => (
                <div key={r.id} className="flex justify-between gap-4 border-b border-neutral-300 py-1">
                  <span>
                    {formatDateTime(r.created_at)}:{" "}
                    {r.order_return_items.map((ri) => `${ri.quantity} × ${itemNames.get(ri.order_item_id) ?? t.common.item}`).join(", ")}
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
                {order.payment_status === "paid" ? r.paidInStore : r.paymentPending} · {t.paymentMethod[order.payment_method]}
              </div>
              <div className="text-4xl font-extrabold tabular-nums">
                {formatMoney(order.total_amount - order.refunded_amount)}
              </div>
            </>
          ) : order.payment_status === "paid" ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide">
                {r.paidVia(t.paymentMethod[order.payment_method])}
              </div>
              <div className="text-4xl font-extrabold tabular-nums">{formatMoney(0)}</div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide">
                {order.payment_method === "whish" ? r.whishNotConfirmed : r.codCollect}
              </div>
              <div className="text-4xl font-extrabold tabular-nums">{formatMoney(order.total_amount)}</div>
            </>
          )}
        </section>

        {order.notes && (
          <section className="text-sm">
            <span className="font-semibold">{t.common.notes}: </span>
            <span className="whitespace-pre-wrap">{order.notes}</span>
          </section>
        )}

        <footer className="flex justify-between border-t border-black pt-3 text-xs">
          <span>{r.statusLine(t.status[order.status])}</span>
          <span>{r.thanks(brand.name)}</span>
        </footer>
      </article>
    </div>
  );
}
