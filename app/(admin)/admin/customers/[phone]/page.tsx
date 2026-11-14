import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { CustomerNoteForm } from "@/components/admin/customer-note-form";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_SOURCE_LABELS, orderRef } from "@/lib/orders";
import { waLink } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer" };

type Props = PageProps<"/admin/customers/[phone]">;

export default function CustomerPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading customer…</p>}>
      <Customer params={props.params} />
    </Suspense>
  );
}

async function Customer({ params }: { params: Props["params"] }) {
  const { phone: key } = await params;
  if (!/^\d{7,8}$/.test(key)) notFound();

  const supabase = await createClient();
  const [list, orders, note] = await Promise.all([
    supabase.rpc("admin_customers", { p_search: key, p_limit: 50 }),
    supabase.rpc("admin_customer_orders", { p_key: key }),
    supabase.from("customer_notes").select("note").eq("phone_key", key).maybeSingle(),
  ]);

  const customer = list.data?.find((c) => c.phone_key === key);
  if (!customer) notFound();
  const history = orders.data ?? [];

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.customer_name}</h1>
          <p className="text-sm text-muted-foreground">Last order {formatDateTime(customer.last_order_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={waLink(customer.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "border-[#25D366] text-[#128C7E]")}
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <Link href="/admin/orders/new" className={cn(buttonVariants())}>
            <Plus className="size-4" /> New order
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={String(customer.orders_count)} />
        <Stat label="Total spent (net)" value={formatMoney(Number(customer.total_spent))} />
        <Stat
          label="Average order"
          value={formatMoney(customer.orders_count > 0 ? Number(customer.total_spent) / Number(customer.orders_count) : 0)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <a href={`tel:${customer.phone}`} className="tabular-nums hover:underline">
                {customer.phone}
              </a>
              {customer.phone2 && <div className="tabular-nums text-muted-foreground">{customer.phone2}</div>}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Zone</div>
              {customer.zone_name ?? "—"}
            </div>
            <div className="whitespace-pre-wrap">
              <div className="text-xs text-muted-foreground">Latest address</div>
              {customer.address || "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Private notes</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerNoteForm phoneKey={key} note={note.data?.note ?? ""} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      {orderRef(o.order_number)}
                    </Link>
                    {o.order_source !== "online" && (
                      <div className="text-xs text-muted-foreground">{ORDER_SOURCE_LABELS[o.order_source]}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge method={o.payment_method} status={o.payment_status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(o.total_amount)}
                    {o.refunded_amount > 0 && <div className="text-xs text-rose-700">−{formatMoney(o.refunded_amount)} refunded</div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
