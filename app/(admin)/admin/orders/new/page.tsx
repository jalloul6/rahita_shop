import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PosForm } from "@/components/admin/pos-form";
import { createClient } from "@/lib/supabase/server";
import { getAdminT } from "@/lib/i18n/admin-server";

export const metadata: Metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <NewOrder />
    </Suspense>
  );
}

async function NewOrder() {
  const t = await getAdminT();
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t.common.backToOrders}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.pos.title}</h1>
        <p className="text-sm text-muted-foreground">{t.pos.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.pos.loading}</p>}>
        <PosData />
      </Suspense>
    </div>
  );
}

async function PosData() {
  const supabase = await createClient();
  const [products, zones] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price, stock_quantity, category, image_url, is_active")
      .order("name")
      .limit(1000),
    supabase.from("shipping_zones").select("id, zone_name, delivery_fee").eq("is_active", true).order("zone_name"),
  ]);

  const error = products.error ?? zones.error;
  const t = await getAdminT();
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {t.common.couldNotLoad(t.products.what, error.message)}
      </p>
    );
  }

  return <PosForm products={products.data ?? []} zones={zones.data ?? []} />;
}
