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
import { ALERT_STOCK } from "@/lib/products";
import { orderRef } from "@/lib/orders";
import { SHOP_TIMEZONE } from "@/lib/shop";
import { getAdminT } from "@/lib/i18n/admin-server";
import type { AdminDict } from "@/lib/i18n/admin";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const t = await getAdminT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.dashboard.loading}</p>}>
        <DashboardContent t={t} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ t }: { t: AdminDict }) {
  const d = t.dashboard;
  const supabase = await createClient();

  const [stats, lowStock, latest] = await Promise.all([
    supabase.rpc("admin_dashboard_stats", { p_tz: SHOP_TIMEZONE }),
    supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("is_active", true)
      .lte("stock_quantity", ALERT_STOCK)
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
        {d.loadError(error?.message ?? "no data")}
      </p>
    );
  }

  const { kpis, top_products } = stats.data as DashboardStats;
  const products = lowStock.data ?? [];
  const inProgress = kpis.pending + kpis.processing;

  return (
    <>
      {products.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            {d.lowStockBanner(products.length, ALERT_STOCK)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-sm hover:border-amber-500 dark:border-amber-500/40 dark:bg-card dark:hover:border-amber-400"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className={p.stock_quantity === 0 ? "font-semibold text-red-700 dark:text-red-400" : "font-semibold text-amber-700 dark:text-amber-300"}>
                    {p.stock_quantity === 0 ? d.out : d.left(p.stock_quantity)}
                  </span>
                  <span className="text-xs text-muted-foreground underline">{d.restock}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={d.netRevenue} value={formatMoney(kpis.total_sales)} hint={d.netRevenueHint} />
        <Stat
          label={d.today}
          value={formatMoney(kpis.today_sales)}
          hint={d.todayHint(kpis.today_orders)}
        />
        <Stat
          label={d.month}
          value={formatMoney(kpis.month_sales)}
          hint={d.monthHint(kpis.month_orders)}
        />
        <Stat
          label={d.inProgress}
          value={String(inProgress)}
          hint={d.inProgressHint(kpis.pending, kpis.processing)}
          href="/admin/orders?status=pending"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={d.outForDelivery}
          value={String(kpis.out_for_delivery)}
          hint={d.outForDeliveryHint}
          href="/admin/orders?status=out_for_delivery"
        />
        <Stat label={d.whishToConfirm} value={String(kpis.unpaid_whish)} hint={d.whishToConfirmHint} />
        <Stat label={d.refunds} value={formatMoney(kpis.refunds_total ?? 0)} hint={d.refundsHint} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              {d.topProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top_products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.noSales}</p>
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
                    <span className="shrink-0 text-end tabular-nums">
                      {d.sold(p.quantity)}
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
              {d.lowStock(ALERT_STOCK)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.allStocked(ALERT_STOCK)}</p>
            ) : (
              <ul className="divide-y">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/admin/products/${p.id}/edit`} className="min-w-0 truncate font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.stock_quantity === 0 ? (
                      <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                        {d.outOfStock}
                      </Badge>
                    ) : (
                      <span className="shrink-0 font-medium text-amber-700 tabular-nums dark:text-amber-300">
                        {d.left(p.stock_quantity)}
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
            <CardTitle>{d.latestOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.order}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-end">{t.common.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(latest.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      {d.noOrders}
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
                      <TableCell className="text-end tabular-nums">{formatMoney(o.total_amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Link href="/admin/orders" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
              {d.viewAll}
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
