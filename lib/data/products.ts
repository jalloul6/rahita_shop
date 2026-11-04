import "server-only";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAdminProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price, stock_quantity, image_url, is_sponsored, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return { products: data ?? [], error: error?.message };
}

export async function getProduct(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("category");
  return [...new Set((data ?? []).map((r) => r.category))].sort();
}
