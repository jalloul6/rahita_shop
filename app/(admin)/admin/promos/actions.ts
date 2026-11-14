"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/guard";
import { promoSchema } from "@/lib/validators";
import { getAdminT } from "@/lib/i18n/admin-server";
import { issuesMessage } from "@/lib/i18n/admin";

export type PromoState = { error?: string; success?: string };

export async function createPromo(_prev: PromoState, formData: FormData): Promise<PromoState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const parsed = promoSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    discount_type: String(formData.get("discount_type") ?? ""),
    discount_value: String(formData.get("discount_value") ?? ""),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return { error: issuesMessage(parsed.error.issues, t) };

  const { error } = await supabase.from("promo_codes").insert(parsed.data);
  if (error) return { error: error.code === "23505" ? t.msg.codeExists : error.message };

  revalidatePath("/admin/promos");
  return { success: t.msg.codeCreated(parsed.data.code) };
}

export async function setPromoActive(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  if (!supabase) return;
  await supabase
    .from("promo_codes")
    .update({ is_active: formData.get("value") === "true" })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/promos");
}

// Orders keep the code text and discount amount, so deleting a code never affects past orders.
export async function deletePromo(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  if (!supabase) return;
  await supabase.from("promo_codes").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/promos");
}
