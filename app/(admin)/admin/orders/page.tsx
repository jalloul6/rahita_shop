import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Download, Plus } from "lucide-react";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus, orderRef } from "@/lib/orders";
import { getAdminT } from "@/lib/i18n/admin-server";
import type { AdminDict } from "@/lib/i18n/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const PAGE_LIMIT = 200;

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Orders searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  const t = await getAdminT();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.orders.title}</h1>
          <p className="text-sm text-muted-foreground">{t.orders.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders/new" className={cn(buttonVariants({ variant: "default" }))}>
            <Plus className="size-4" />
            {t.nav.newOrder}
          </Link>
          {/* Plain link: the response is a file download, not a page navigation */}
          <a href="/admin/api/manifest" download className={cn(buttonVariants({ variant: "outline" }))}>
            <Download className="size-4" />
            {t.orders.exportManifest}
          </a>
        </div>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.orders.loading}</p>}>
        <OrdersView searchParams={searchParams} t={t} />
      </Suspense>
    </div>
  );
}

async function OrdersView({
  searchParams,
  t,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
  t: AdminDict;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isOrderStatus(raw) ? raw : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, phone1, phone2, status, total_amount, refunded_amount, order_source, payment_method, payment_status, created_at, shipping_zones(zone_name)"
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);
  if (status) query = query.eq("status", status);

  const { data: orders, error } = await query;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.orders.filterAria}>
        <FilterLink href="/admin/orders" active={!status}>
          {t.orders.all}
        </FilterLink>
        {ORDER_STATUSES.map((s) => (
          <FilterLink key={s.value} href={`/admin/orders?status=${s.value}`} active={status === s.value}>
            {t.status[s.value]}
          </FilterLink>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t.common.couldNotLoad(t.orders.what, error.message)}
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.order}</TableHead>
                <TableHead>{t.common.customer}</TableHead>
                <TableHead>{t.common.phone}</TableHead>
                <TableHead>{t.common.zone}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.common.payment}</TableHead>
                <TableHead className="text-end">{t.common.total}</TableHead>
                <TableHead>{t.common.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {status ? t.orders.noneWithStatus : t.orders.noneYet}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="underline-offset-2 hover:underline">
                        {orderRef(o.order_number)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{o.customer_name}</div>
                      {o.order_source !== "online" && (
                        <div className="text-xs text-muted-foreground">{t.source[o.order_source]}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{o.phone1}</div>
                      {o.phone2 && <div className="text-xs text-muted-foreground">{o.phone2}</div>}
                    </TableCell>
                    <TableCell>{o.shipping_zones?.zone_name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge method={o.payment_method} status={o.payment_status} />
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatMoney(o.total_amount)}
                      {o.refunded_amount > 0 && (
                        <div className="text-xs text-rose-700 dark:text-rose-400">{t.common.refundedSuffix(formatMoney(o.refunded_amount))}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {orders && orders.length === PAGE_LIMIT && (
        <p className="text-xs text-muted-foreground">{t.orders.showingLatest(PAGE_LIMIT)}</p>
      )}
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        buttonVariants({ variant: active ? "default" : "outline", size: "sm" })
      )}
    >
      {children}
    </Link>
  );
}
