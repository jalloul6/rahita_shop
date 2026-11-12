import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PosForm } from "@/components/admin/pos-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
        <p className="text-sm text-muted-foreground">Ring up an in-store sale, or enter an order taken by phone or WhatsApp.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading products…</p>}>
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
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load products: {error.message}
      </p>
    );
  }

  return <PosForm products={products.data ?? []} zones={zones.data ?? []} />;
}
