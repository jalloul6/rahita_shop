"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/guard";
import { zoneSchema } from "@/lib/validators";

export type ZoneState = { error?: string; success?: string };

function parse(formData: FormData) {
  return zoneSchema.safeParse({
    zone_name: String(formData.get("zone_name") ?? ""),
    delivery_fee: String(formData.get("delivery_fee") ?? ""),
    is_active: formData.get("is_active") === "on",
  });
}

function dbError(error: { code?: string; message: string }) {
  return error.code === "23505" ? "A zone with this name already exists." : error.message;
}

export async function createZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { error } = await supabase.from("shipping_zones").insert(parsed.data);
  if (error) return { error: dbError(error) };

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: "Zone added." };
}

export async function updateZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { error } = await supabase
    .from("shipping_zones")
    .update(parsed.data)
    .eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbError(error) };

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: "Saved." };
}

export async function deleteZone(_prev: ZoneState, formData: FormData): Promise<ZoneState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));
  if (error) {
    // 23503: orders reference this zone
    return {
      error:
        error.code === "23503"
          ? "This zone is used by existing orders and can't be deleted. Untick Active to hide it from checkout instead."
          : error.message,
    };
  }

  revalidatePath("/admin/zones");
  updateTag("zones");
  return { success: "Deleted." };
}
