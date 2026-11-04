import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { LOW_STOCK } from "@/lib/products";
import { SHOP_TIMEZONE } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">What needs attention today.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading dashboard…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIMEZONE }).format(d); // YYYY-MM-DD

async function DashboardContent() {
  const supabase = await createClient();
  const now = new Date();
  // Look back 48h so "today" is covered in any timezone, then bucket by shop-local date.
  const since = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();

  const countOf = (status: OrderStatus) =>
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status);

  const [pending, processing, outForDelivery, recent48h, lowStock, latest] = await Promise.all([
    countOf("pending"),
    countOf("processing"),
    countOf("out_for_delivery"),
    supabase
      .from("orders")
      .select("status, total_amount, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
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
      .select("id, order_number, customer_name, status, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const error = [pending, processing, outForDelivery, recent48h, lowStock, latest].find((r) => r.error)?.error;
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load dashboard: {error.message}
      </p>
    );
  }

  const today = dayKey(now);
  const todays = (recent48h.data ?? []).filter((o) => dayKey(new Date(o.created_at)) === today);
  const todaysValue = todays
    .filter((o) => o.status !== "canceled" && o.status !== "returned")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const products = lowStock.data ?? [];
  const outOfStock = products.filter((p) => p.stock_quantity === 0);
  const low = products.filter((p) => p.stock_quantity > 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders today" value={String(todays.length)} hint={`${formatMoney(todaysValue)} excluding canceled`} />
        <Stat label="Pending" value={String(pending.count ?? 0)} hint="Waiting to be confirmed" href="/admin/orders?status=pending" />
        <Stat label="Processing" value={String(processing.count ?? 0)} hint="Being prepared" href="/admin/orders?status=processing" />
        <Stat label="Out for delivery" value={String(outForDelivery.count ?? 0)} hint="With the courier" href="/admin/orders?status=out_for_delivery" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                {[...outOfStock, ...low].map((p) => (
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
            {products.length === 20 && <p className="mt-2 text-xs text-muted-foreground">Showing the 20 lowest.</p>}
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(latest.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (latest.data ?? []).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                          #{o.order_number}
                        </Link>
                        <div className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</div>
                      </TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
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
    <Card className={href ? "transition-colors hover:bg-muted/50" : undefined}>
      <CardContent className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
