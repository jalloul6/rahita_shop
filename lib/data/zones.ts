import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getAdminZones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("id, zone_name, delivery_fee, is_active")
    .order("zone_name");
  return { zones: data ?? [], error: error?.message };
}
