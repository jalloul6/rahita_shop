import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Printer } from "lucide-react";
import { PaymentActions } from "@/components/admin/payment-actions";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { ReturnPanel } from "@/components/admin/return-panel";
import { StatusActions } from "@/components/admin/status-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusStepper } from "@/components/admin/status-stepper";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_SOURCE_LABELS, PAYMENT_METHOD_LABELS, amountToCollect, canReturn, orderRef } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };

export default function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading order…</p>}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const itemNames = new Map(order.order_items.map((i) => [i.id, i.product_name]));

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Order {orderRef(order.order_number)}</h1>
          <StatusBadge status={order.status} />
          {order.order_source !== "online" && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{ORDER_SOURCE_LABELS[order.order_source]}</span>
          )}
        </div>
        <Link
          href={`/admin/orders/${order.id}/receipt`}
          target="_blank"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Printer className="size-4" />
          Print Receipt / Airway Bill
        </Link>
      </div>
      <p className="-mt-4 text-sm text-muted-foreground">Placed {formatDateTime(order.created_at)}</p>

      <Card>
        <CardHeader>
          <CardTitle>Delivery status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <StatusStepper status={order.status} />
          <StatusActions orderId={order.id} status={order.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">{PAYMENT_METHOD_LABELS[order.payment_method]}</div>
            <div className="text-muted-foreground">
              {order.payment_status === "paid"
                ? "Paid. The courier collects nothing."
                : order.payment_method === "whish"
                  ? "Waiting for the Whish transfer receipt on WhatsApp."
                  : "Courier collects cash on delivery (marked paid automatically when delivered)."}
            </div>
            <div className="pt-1 font-semibold tabular-nums">To collect: {formatMoney(amountToCollect(order))}</div>
          </div>
          <div className="flex items-start gap-4">
            <PaymentBadge method={order.payment_method} status={order.payment_status} />
            <PaymentActions orderId={order.id} status={order.payment_status} />
          </div>
        </CardContent>
      </Card>

      {(canReturn(order) || order.order_returns.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Returns &amp; refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {order.order_returns.length > 0 && (
              <ul className="space-y-3">
                {[...order.order_returns]
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((r) => (
                    <li key={r.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{formatDateTime(r.created_at)}</span>
                        <span className="font-semibold tabular-nums">Refunded {formatMoney(r.refund_amount)}</span>
                      </div>
                      <ul className="mt-1 text-muted-foreground">
                        {r.order_return_items.map((ri) => (
                          <li key={ri.order_item_id}>
                            {ri.quantity} × {itemNames.get(ri.order_item_id) ?? "Item"}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.restocked ? "Restocked" : "Not restocked (damaged)"}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {canReturn(order) && (
              <ReturnPanel
                orderId={order.id}
                items={order.order_items}
                maxRefund={Math.max(0, order.total_amount - order.refunded_amount)}
                discountRatio={order.subtotal > 0 ? order.discount_amount / order.subtotal : 0}
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Customer</CardTitle>
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
              <div className="text-xs text-muted-foreground">Zone</div>
              {order.shipping_zones?.zone_name ?? "—"}
            </div>
            <div className="whitespace-pre-wrap">
              <div className="text-xs text-muted-foreground">Address</div>
              {order.address}
            </div>
            {order.notes && (
              <div className="whitespace-pre-wrap">
                <div className="text-xs text-muted-foreground">Customer notes</div>
                {order.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_name}
                      {item.returned_quantity > 0 && (
                        <div className="text-xs text-rose-700">{item.returned_quantity} returned</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(item.unit_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(item.unit_price * item.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-normal">Subtotal</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(order.subtotal)}</TableCell>
                </TableRow>
                {order.discount_amount > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-normal">
                      Discount{order.promo_code ? ` (${order.promo_code})` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">−{formatMoney(order.discount_amount)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-normal">Shipping</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(order.shipping_fee)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">Order total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(order.total_amount)}</TableCell>
                </TableRow>
                {order.refunded_amount > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-normal text-rose-700">Refunded</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-700">−{formatMoney(order.refunded_amount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">Net amount</TableCell>
                      <TableCell className="text-right tabular-nums">
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
