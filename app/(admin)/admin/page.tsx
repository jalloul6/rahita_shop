import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Trophy } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { LOW_STOCK } from "@/lib/products";
import { orderRef } from "@/lib/orders";
import { SHOP_TIMEZONE } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sales overview and what needs attention today.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading dashboard…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  const [stats, lowStock, latest] = await Promise.all([
    supabase.rpc("admin_dashboard_stats", { p_tz: SHOP_TIMEZONE }),
    supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("is_active", true)
      .lte("stock_quantity", LOW_STOCK)
      .order("stock_quantity", { ascending: true })
      .order("name")
      .limit(20),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, status, payment_method, payment_status, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const error = stats.error ?? lowStock.error ?? latest.error;
  if (error || !stats.data) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load dashboard: {error?.message ?? "no data"}. If this mentions admin_dashboard_stats, run
        supabase/migrations/002_payments_promos_analytics.sql in the Supabase SQL editor.
      </p>
    );
  }

  const { kpis, top_products } = stats.data as DashboardStats;
  const products = lowStock.data ?? [];
  const inProgress = kpis.pending + kpis.processing;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total sales" value={formatMoney(kpis.total_sales)} hint="Delivered or paid orders" />
        <Stat
          label="Today"
          value={formatMoney(kpis.today_sales)}
          hint={`${kpis.today_orders} order${kpis.today_orders === 1 ? "" : "s"} placed, excl. canceled`}
        />
        <Stat
          label="This month"
          value={formatMoney(kpis.month_sales)}
          hint={`${kpis.month_orders} order${kpis.month_orders === 1 ? "" : "s"}, excl. canceled`}
        />
        <Stat
          label="In progress"
          value={String(inProgress)}
          hint={`${kpis.pending} pending · ${kpis.processing} processing`}
          href="/admin/orders?status=pending"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Out for delivery"
          value={String(kpis.out_for_delivery)}
          hint="With the courier"
          href="/admin/orders?status=out_for_delivery"
        />
        <Stat label="Whish payments to confirm" value={String(kpis.unpaid_whish)} hint="Whish orders still marked unpaid" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Top products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top_products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <ol className="space-y-3">
                {top_products.map((p, i) => (
                  <li key={p.product_id} className="flex items-center gap-3 text-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                      {i + 1}
                    </span>
                    <Link href={`/admin/products/${p.product_id}/edit`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                      {p.name}
                    </Link>
                    <span className="shrink-0 text-right tabular-nums">
                      {p.quantity} sold
                      <span className="block text-xs text-muted-foreground">{formatMoney(Number(p.revenue))}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              Stock alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products have more than {LOW_STOCK} in stock.</p>
            ) : (
              <ul className="divide-y">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/admin/products/${p.id}/edit`} className="min-w-0 truncate font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.stock_quantity === 0 ? (
                      <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                        Out of stock
                      </Badge>
                    ) : (
                      <span className="shrink-0 font-medium text-amber-700 tabular-nums dark:text-amber-300">
                        {p.stock_quantity} left
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(latest.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (latest.data ?? []).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                          {orderRef(o.order_number)}
                        </Link>
                        <div className="text-xs text-muted-foreground">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <StatusBadge status={o.status} />
                        <PaymentBadge method={o.payment_method} status={o.payment_status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(o.total_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Link href="/admin/orders" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
              View all orders
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint: string; href?: string }) {
  const body = (
    <Card className={href ? "h-full transition-colors hover:bg-muted/50" : "h-full"}>
      <CardContent className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
