"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getAdminClient } from "@/lib/supabase/guard";
import { zoneSchema } from "@/lib/validators";
import { getAdminT } from "@/lib/i18n/admin-server";
import { issuesMessage, type AdminDict } from "@/lib/i18n/admin";

export type ZoneState = { error?: string; success?: string };

function parse(formData: FormData) {
  return zoneSchema.safeParse({
    zone_name: String(formData.get("zone_name") ?? ""),
    delivery_fee: String(formData.get("delivery_fee") ?? ""),
    is_active: formData.get("is_active") === "on",
  });
}

function dbError(error: { code?: string; message: string }, t: AdminDict) {
  return error.code === "23505" ? t.msg.zoneExists : error.message;
}

export async function createZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const parsed = parse(formData);
  if (!parsed.success) return { error: issuesMessage(parsed.error.issues, t) };

  const { error } = await supabase.from("shipping_zones").insert(parsed.data);
  if (error) return { error: dbError(error, t) };

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: t.msg.zoneAdded };
}

export async function updateZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const parsed = parse(formData);
  if (!parsed.success) return { error: issuesMessage(parsed.error.issues, t) };

  const { error } = await supabase
    .from("shipping_zones")
    .update(parsed.data)
    .eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbError(error, t) };

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: t.msg.saved };
}

export async function deleteZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));
  if (error) {
    // 23503: orders reference this zone
    return {
      error:
        error.code === "23503"
          ? t.msg.zoneInOrders
          : error.message,
    };
  }

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: t.msg.deleted };
}
