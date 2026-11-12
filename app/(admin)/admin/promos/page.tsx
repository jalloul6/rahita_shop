import { Suspense } from "react";
import type { Metadata } from "next";
import { CreatePromoForm, DeletePromoButton } from "@/components/admin/promo-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setPromoActive } from "./actions";

export const metadata: Metadata = { title: "Promo Codes" };

export default function PromosPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promo Codes</h1>
        <p className="text-sm text-muted-foreground">
          Discounts apply to the products subtotal, not the delivery fee. Customers can type codes in any case.
        </p>
      </div>
      <CreatePromoForm />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading codes…</p>}>
        <PromoList />
      </Suspense>
    </div>
  );
}

async function PromoList() {
  const supabase = await createClient();
  const { data: promos, error } = await supabase
    .from("promo_codes")
    .select("id, code, discount_type, discount_value, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load promo codes: {error.message}
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {promos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                No promo codes yet.
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
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                    <Button type="submit" variant="ghost" size="sm">
                      {p.is_active ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                <TableCell className="text-right">
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
