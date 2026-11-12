import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

// Public, cached catalog reads. Tags are invalidated by admin actions (updateTag).
// On a failed read we return an empty result with a very short lifetime so a transient
// error (or missing env) never sticks in the cache for minutes.

export type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category: string;
  is_sponsored: boolean;
};

const COLUMNS = "id, name, description, price, stock_quantity, image_url, category, is_sponsored";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSponsoredProducts(): Promise<StoreProduct[]> {
  "use cache";
  cacheTag("products");
  try {
    const { data, error } = await createPublicClient()
      .from("products")
      .select(COLUMNS)
      .eq("is_active", true)
      .eq("is_sponsored", true)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    cacheLife("minutes");
    return data;
  } catch (e) {
    console.error("getSponsoredProducts failed", e);
    cacheLife("seconds");
    return [];
  }
}

export async function getLatestProducts(limit = 8): Promise<StoreProduct[]> {
  "use cache";
  cacheTag("products");
  try {
    const { data, error } = await createPublicClient()
      .from("products")
      .select(COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    cacheLife("minutes");
    return data;
  } catch (e) {
    console.error("getLatestProducts failed", e);
    cacheLife("seconds");
    return [];
  }
}

// category = null returns everything
export async function getCatalog(category: string | null): Promise<StoreProduct[]> {
  "use cache";
  cacheTag("products");
  try {
    let query = createPublicClient()
      .from("products")
      .select(COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    cacheLife("minutes");
    return data;
  } catch (e) {
    console.error("getCatalog failed", e);
    cacheLife("seconds");
    return [];
  }
}

export async function getStoreCategories(): Promise<string[]> {
  "use cache";
  cacheTag("products");
  try {
    const { data, error } = await createPublicClient().from("products").select("category").eq("is_active", true);
    if (error) throw error;
    cacheLife("minutes");
    return [...new Set(data.map((r) => r.category))].sort();
  } catch (e) {
    console.error("getStoreCategories failed", e);
    cacheLife("seconds");
    return [];
  }
}

export async function getStoreProduct(id: string): Promise<StoreProduct | null> {
  "use cache";
  cacheTag("products");
  if (!UUID.test(id)) {
    cacheLife("minutes");
    return null;
  }
  try {
    const { data, error } = await createPublicClient().from("products").select(COLUMNS).eq("id", id).eq("is_active", true).maybeSingle();
    if (error) throw error;
    cacheLife("minutes");
    return data;
  } catch (e) {
    console.error("getStoreProduct failed", e);
    cacheLife("seconds");
    return null;
  }
}

export async function getCheckoutZones(): Promise<{ id: string; zone_name: string; delivery_fee: number }[]> {
  "use cache";
  cacheTag("zones");
  try {
    const { data, error } = await createPublicClient()
      .from("shipping_zones")
      .select("id, zone_name, delivery_fee")
      .eq("is_active", true)
      .order("zone_name");
    if (error) throw error;
    cacheLife("minutes");
    return data;
  } catch (e) {
    console.error("getCheckoutZones failed", e);
    cacheLife("seconds");
    return [];
  }
}

// Storefront theme chosen in /admin/appearance. Falls back to the default theme if the
// settings table is missing or unreachable (cached briefly so the store never breaks).
export async function getShopTheme(): Promise<ThemeId> {
  "use cache";
  cacheTag("settings");
  try {
    const { data, error } = await createPublicClient().from("shop_settings").select("theme").eq("id", 1).maybeSingle();
    if (error) throw error;
    cacheLife("hours");
    return isThemeId(data?.theme) ? data.theme : DEFAULT_THEME;
  } catch (e) {
    console.error("getShopTheme failed", e);
    cacheLife("minutes");
    return DEFAULT_THEME;
  }
}
