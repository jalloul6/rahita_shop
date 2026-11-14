"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getAdminClient } from "@/lib/supabase/guard";
import { isThemeId } from "@/lib/themes";
import { getAdminT } from "@/lib/i18n/admin-server";

export type ThemeState = { error?: string; success?: string };

export async function saveTheme(_prev: ThemeState, formData: FormData): Promise<ThemeState> {
  const theme = formData.get("theme");
  const t = await getAdminT();
  if (!isThemeId(theme)) return { error: t.msg.chooseTheme };

  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const { error } = await supabase.from("shop_settings").upsert({ id: 1, theme });
  if (error) {
    return {
      error: error.message.includes("shop_settings")
        ? t.msg.settingsMissing
        : error.message,
    };
  }

  updateTag("settings"); // storefront layout re-reads the theme on the next request
  revalidatePath("/admin/appearance");
  return { success: t.msg.themeLive(t.appearance.themes[theme].name) };
}
