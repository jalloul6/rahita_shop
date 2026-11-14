import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Printer } from "lucide-react";
import { PaymentActions } from "@/components/admin/payment-actions";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { ExchangePanel } from "@/components/admin/exchange-panel";
import { ReturnPanel } from "@/components/admin/return-panel";
import { StatusActions } from "@/components/admin/status-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusStepper } from "@/components/admin/status-stepper";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { amountToCollect, canReturn, orderRef } from "@/lib/orders";
import { getAdminT } from "@/lib/i18n/admin-server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

export default function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const t = await getAdminT();
  const o = t.order;
  const exchangeMoney = t.exchangeMoney;
  const itemNames = new Map(order.order_items.map((i) => [i.id, i.product_name]));
  const returnable = canReturn(order);
  // Replacement candidates for Exchange Item: anything with stock, hidden products included.
  const exchangeProducts = returnable
    ? ((
        await (await createClient())
          .from("products")
          .select("id, name, price, stock_quantity")
          .gt("stock_quantity", 0)
          .order("name")
          .limit(1000)
      ).data ?? [])
    : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t.common.backToOrders}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{o.title(orderRef(order.order_number))}</h1>
          <StatusBadge status={order.status} />
          {order.order_source !== "online" && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{t.source[order.order_source]}</span>
          )}
        </div>
        <Link
          href={`/admin/orders/${order.id}/receipt`}
          target="_blank"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Printer className="size-4" />
          {o.printReceipt}
        </Link>
      </div>
      <p className="-mt-4 text-sm text-muted-foreground">{o.placed(formatDateTime(order.created_at))}</p>

      <Card>
        <CardHeader>
          <CardTitle>{o.deliveryStatus}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StatusStepper status={order.status} />
          <StatusActions orderId={order.id} status={order.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{o.paymentCard}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">{t.paymentMethod[order.payment_method]}</div>
            <div className="text-muted-foreground">
              {order.payment_status === "paid"
                ? o.paidNote
                : order.payment_method === "whish"
                  ? o.whishWaiting
                  : o.codNote}
            </div>
            <div className="pt-1 font-semibold tabular-nums">{o.toCollect(formatMoney(amountToCollect(order)))}</div>
          </div>
          <div className="flex items-start gap-4">
            <PaymentBadge method={order.payment_method} status={order.payment_status} />
            <PaymentActions orderId={order.id} status={order.payment_status} />
          </div>
        </CardContent>
      </Card>

      {(returnable ||
        order.order_returns.length > 0 ||
        order.order_exchanges.length > 0 ||
        order.order_exchange_batches.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>{o.returnsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {order.order_exchange_batches.length > 0 && (
              <ul className="space-y-3">
                {[...order.order_exchange_batches]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((b) => (
                    <li key={b.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{o.exchangeAt(formatDateTime(b.created_at))}</span>
                        <span className="font-semibold tabular-nums">{exchangeMoney(b.price_difference)}</span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase">{o.returned}</div>
                          {b.order_exchange_lines
                            .filter((l) => l.direction === "returned")
                            .map((l) => (
                              <div key={l.id}>
                                {l.quantity} × {l.product_name}
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  · {l.restocked ? o.restocked : o.notRestocked}
                                  {l.reason ? ` · ${l.reason}` : ""}
                                </span>
                              </div>
                            ))}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase">{o.given}</div>
                          {b.order_exchange_lines
                            .filter((l) => l.direction === "new")
                            .map((l) => (
                              <div key={l.id}>
                                {l.quantity} × {l.product_name}
                              </div>
                            ))}
                        </div>
                      </div>
                      {(b.shipping_refund > 0 || b.note) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {b.shipping_refund > 0 && o.shippingRefunded(formatMoney(b.shipping_refund))}
                          {b.shipping_refund > 0 && b.note ? " · " : ""}
                          {b.note}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            )}
            {order.order_exchanges.length > 0 && (
              <ul className="space-y-3">
                {[...order.order_exchanges]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((x) => (
                    <li key={x.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{o.exchangeAt(formatDateTime(x.created_at))}</span>
                        <span className="font-semibold tabular-nums">{exchangeMoney(x.price_difference)}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {x.returned_quantity} × {x.returned_product_name} → {x.new_quantity} × {x.new_product_name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {x.restocked ? o.legacyRestocked : o.legacyNotRestocked}
                        {x.reason ? ` · ${x.reason}` : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {order.order_returns.length > 0 && (
              <ul className="space-y-3">
                {[...order.order_returns]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((r) => (
                    <li key={r.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{formatDateTime(r.created_at)}</span>
                        <span className="font-semibold tabular-nums">{o.refundedAmount(formatMoney(r.refund_amount))}</span>
                      </div>
                      <ul className="mt-1 text-muted-foreground">
                        {r.order_return_items.map((ri) => (
                          <li key={ri.order_item_id}>
                            {ri.quantity} × {itemNames.get(ri.order_item_id) ?? t.common.item}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.restocked ? o.returnRestocked : o.returnNotRestocked}
                        {r.shipping_refund > 0 ? ` · ${o.inclShipping(formatMoney(r.shipping_refund))}` : ""}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {returnable && (
              <div className="space-y-3">
                <ReturnPanel
                  orderId={order.id}
                  items={order.order_items}
                  maxRefund={Math.max(0, order.total_amount - order.refunded_amount)}
                  discountRatio={order.subtotal > 0 ? order.discount_amount / order.subtotal : 0}
                  shippingFee={order.shipping_fee}
                  shippingRefunded={order.shipping_refunded}
                />
                <ExchangePanel
                  orderId={order.id}
                  items={order.order_items}
                  products={exchangeProducts}
                  shippingFee={order.shipping_fee}
                  shippingRefunded={order.shipping_refunded}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t.common.customer}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="font-medium">{order.customer_name}</div>
            <div>
              <a className="underline-offset-2 hover:underline" href={`tel:${order.phone1}`}>
                {order.phone1}
              </a>
              {order.phone2 && (
                <>
                  <br />
                  <a className="underline-offset-2 hover:underline" href={`tel:${order.phone2}`}>
                    {order.phone2}
                  </a>
                </>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t.common.zone}</div>
              {order.shipping_zones?.zone_name ?? "—"}
            </div>
            <div className="whitespace-pre-wrap">
              <div className="text-xs text-muted-foreground">{t.common.address}</div>
              {order.address}
            </div>
            {order.notes && (
              <div className="whitespace-pre-wrap">
                <div className="text-xs text-muted-foreground">{o.customerNotes}</div>
                {order.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{o.items}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{o.product}</TableHead>
                  <TableHead className="text-end">{t.common.qty}</TableHead>
                  <TableHead className="text-end">{o.unitPrice}</TableHead>
                  <TableHead className="text-end">{o.lineTotal}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_name}
                      {item.from_exchange && <div className="text-xs text-muted-foreground">{o.addedByExchange}</div>}
                      {item.returned_quantity > 0 && (
                        <div className="text-xs text-rose-700 dark:text-rose-400">{o.returnedExchanged(item.returned_quantity)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatMoney(item.unit_price)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatMoney(item.unit_price * item.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-end font-normal">{t.common.subtotal}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(order.subtotal)}</TableCell>
                </TableRow>
                {order.discount_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-end font-normal">
                      {t.common.discount}{order.promo_code ? ` (${order.promo_code})` : ""}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">−{formatMoney(order.discount_amount)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-end font-normal">{t.common.shipping}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(order.shipping_fee)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-end">{o.orderTotal}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(order.total_amount)}</TableCell>
                </TableRow>
                {order.refunded_amount > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={3} className="text-end font-normal text-rose-700 dark:text-rose-400">{t.common.refunded}</TableCell>
                      <TableCell className="text-end tabular-nums text-rose-700 dark:text-rose-400">−{formatMoney(order.refunded_amount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-end">{t.common.netAmount}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(order.total_amount - order.refunded_amount)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
