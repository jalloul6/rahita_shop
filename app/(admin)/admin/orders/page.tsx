import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const PAGE_LIMIT = 200;

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">All customer orders, newest first.</p>
        </div>
        {/* Plain link: the response is a file download, not a page navigation */}
        <a
          href="/admin/api/manifest"
          download
          className={cn(buttonVariants({ variant: "default" }))}
        >
          <Download className="size-4" />
          Export Daily Manifest
        </a>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading orders…</p>}>
        <OrdersView searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function OrdersView({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isOrderStatus(raw) ? raw : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, phone1, phone2, status, total_amount, created_at, shipping_zones(zone_name)"
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);
  if (status) query = query.eq("status", status);

  const { data: orders, error } = await query;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        <FilterLink href="/admin/orders" active={!status}>
          All
        </FilterLink>
        {ORDER_STATUSES.map((s) => (
          <FilterLink key={s.value} href={`/admin/orders?status=${s.value}`} active={status === s.value}>
            {s.label}
          </FilterLink>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load orders: {error.message}
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No orders{status ? " with this status" : " yet"}.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="underline-offset-2 hover:underline">
                        #{o.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>
                      <div>{o.phone1}</div>
                      {o.phone2 && <div className="text-xs text-muted-foreground">{o.phone2}</div>}
                    </TableCell>
                    <TableCell>{o.shipping_zones?.zone_name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(o.total_amount)}</TableCell>
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
        <p className="text-xs text-muted-foreground">Showing the latest {PAGE_LIMIT} orders.</p>
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
