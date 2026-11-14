import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { waLink } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Built automatically from orders and grouped by phone number. Walk-in sales without a phone are not listed.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading customers…</p>}>
        <CustomerList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CustomerList({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.slice(0, 60) ?? "";

  const supabase = await createClient();
  const { data: customers, error } = await supabase.rpc("admin_customers", { p_search: q || null, p_limit: 500 });

  return (
    <>
      <form className="flex max-w-md gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search by name or phone…" className="pl-9" aria-label="Search customers" />
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Search
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load customers: {error.message}
          {error.message.includes("admin_customers") && " Run supabase/migrations/006_cms_customers_multi_exchange.sql first."}
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
                <TableHead>Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {q ? "No customers match your search." : "No customers yet."}
                  </TableCell>
                </TableRow>
              ) : (
                (customers ?? []).map((c) => (
                  <TableRow key={c.phone_key}>
                    <TableCell>
                      <Link href={`/admin/customers/${c.phone_key}`} className="font-medium hover:underline">
                        {c.customer_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{c.phone}</span>
                        <a
                          href={waLink(c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${c.customer_name}`}
                          className="rounded-full p-1 text-[#128C7E] hover:bg-[#25D366]/10"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{c.zone_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.orders_count}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(Number(c.total_spent))}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.last_order_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
