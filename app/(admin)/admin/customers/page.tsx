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
import { getAdminT } from "@/lib/i18n/admin-server";
import type { AdminDict } from "@/lib/i18n/admin";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Customers searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const t = await getAdminT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.customers.title}</h1>
        <p className="text-sm text-muted-foreground">{t.customers.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.customers.loading}</p>}>
        <CustomerList searchParams={searchParams} t={t} />
      </Suspense>
    </div>
  );
}

async function CustomerList({ searchParams, t }: { searchParams: PageProps<"/admin/customers">["searchParams"]; t: AdminDict }) {
  const x = t.customers;
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.slice(0, 60) ?? "";

  const supabase = await createClient();
  const { data: customers, error } = await supabase.rpc("admin_customers", { p_search: q || null, p_limit: 500 });

  return (
    <>
      <form className="flex max-w-md gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={x.searchPlaceholder} className="ps-9" aria-label={x.searchAria} />
        </div>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          {t.common.search}
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t.common.couldNotLoad(x.what, error.message)}
          {error.message.includes("admin_customers") && x.migrationHint}
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.customer}</TableHead>
                <TableHead>{t.common.phone}</TableHead>
                <TableHead>{t.common.zone}</TableHead>
                <TableHead className="text-end">{x.orders}</TableHead>
                <TableHead className="text-end">{x.totalSpent}</TableHead>
                <TableHead>{x.lastOrder}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {q ? x.noMatch : x.empty}
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
                        <span className="tabular-nums" dir="ltr">{c.phone}</span>
                        <a
                          href={waLink(c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={x.whatsappAria(c.customer_name)}
                          className="rounded-full p-1 text-[#128C7E] hover:bg-[#25D366]/10"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{c.zone_name ?? "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{c.orders_count}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">{formatMoney(Number(c.total_spent))}</TableCell>
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
