import { Suspense } from "react";
import type { Metadata } from "next";
import { CreatePromoForm, DeletePromoButton } from "@/components/admin/promo-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setPromoActive } from "./actions";
import { getAdminT } from "@/lib/i18n/admin-server";
import type { AdminDict } from "@/lib/i18n/admin";

export const metadata: Metadata = { title: "Promo Codes" };

export default function PromosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Promos />
    </Suspense>
  );
}

async function Promos() {
  const t = await getAdminT();
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.promos.title}</h1>
        <p className="text-sm text-muted-foreground">{t.promos.subtitle}</p>
      </div>
      <CreatePromoForm />
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.promos.loading}</p>}>
        <PromoList t={t} />
      </Suspense>
    </div>
  );
}

async function PromoList({ t }: { t: AdminDict }) {
  const x = t.promos;
  const supabase = await createClient();
  const { data: promos, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {t.common.couldNotLoad(x.what, error.message)}
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{x.code}</TableHead>
            <TableHead>{x.discount}</TableHead>
            <TableHead>{t.common.status}</TableHead>
            <TableHead>{x.created}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {promos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                {x.empty}
              </TableCell>
            </TableRow>
          ) : (
            promos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-semibold">{p.code}</TableCell>
                <TableCell>{p.discount_type === "percentage" ? `${p.discount_value}%` : formatMoney(p.discount_value)}</TableCell>
                <TableCell>
                  <form action={setPromoActive} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="value" value={String(!p.is_active)} />
                    {p.is_active ? (
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-300">
                        {t.common.active}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {x.disabled}
                      </Badge>
                    )}
                    <Button type="submit" variant="ghost" size="sm">
                      {p.is_active ? x.disable : x.enable}
                    </Button>
                  </form>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                <TableCell className="text-end">
                  <DeletePromoButton id={p.id} code={p.code} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
