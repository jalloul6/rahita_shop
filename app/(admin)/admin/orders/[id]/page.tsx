import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Printer } from "lucide-react";
import { PaymentActions } from "@/components/admin/payment-actions";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { StatusActions } from "@/components/admin/status-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusStepper } from "@/components/admin/status-stepper";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrder } from "@/lib/data/orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, amountToCollect, orderRef } from "@/lib/orders";
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

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Order {orderRef(order.order_number)}</h1>
          <StatusBadge status={order.status} />
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
                    <TableCell>{item.product_name}</TableCell>
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
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
