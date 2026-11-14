"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/guard";
import { settingsSchema } from "@/lib/validators";
import { getAdminT } from "@/lib/i18n/admin-server";

export type SettingsState = { error?: string; success?: string; fieldErrors?: Partial<Record<string, string[]>> };

const TEXT_FIELDS = [
  "store_name_en",
  "store_name_ar",
  "tagline_en",
  "tagline_ar",
  "logo_url",
  "whatsapp_number",
  "whish_number",
  "instagram_url",
  "copyright_en",
  "copyright_ar",
  "announcement_en",
  "announcement_ar",
  "hero_image_url",
  "hero_title_en",
  "hero_title_ar",
  "hero_text_en",
  "hero_text_ar",
  "hero_cta_en",
  "hero_cta_ar",
  "hero_cta_url",
] as const;

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const raw: Record<string, unknown> = { announcement_enabled: formData.get("announcement_enabled") === "on" };
  for (const f of TEXT_FIELDS) raw[f] = String(formData.get(f) ?? "");

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: t.msg.fixFields, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { error } = await supabase.from("shop_settings").upsert({ id: 1, ...parsed.data });
  if (error) {
    return {
      error: /column|schema cache/i.test(error.message)
        ? t.msg.runMigration(/logo_url/.test(error.message) ? "008_store_logo.sql" : /store_name|tagline/.test(error.message) ? "007_store_branding.sql" : "006_cms_customers_multi_exchange.sql")
        : error.message,
    };
  }

  updateTag("settings"); // storefront re-reads settings on the next request
  revalidatePath("/admin/settings");
  return { success: t.msg.settingsSaved };
}
