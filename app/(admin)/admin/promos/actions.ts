"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/guard";
import { promoSchema } from "@/lib/validators";

export type PromoState = { error?: string; success?: string };

export async function createPromo(_prev: PromoState, formData: FormData): Promise<PromoState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const parsed = promoSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    discount_type: String(formData.get("discount_type") ?? ""),
    discount_value: String(formData.get("discount_value") ?? ""),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  const { error } = await supabase.from("promo_codes").insert(parsed.data);
  if (error) return { error: error.code === "23505" ? "This code already exists." : error.message };

  revalidatePath("/admin/promos");
  return { success: `Code ${parsed.data.code} created.` };
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
