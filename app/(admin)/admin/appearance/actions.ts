"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getAdminClient } from "@/lib/supabase/guard";
import { isThemeId, THEMES } from "@/lib/themes";

export type ThemeState = { error?: string; success?: string };

export async function saveTheme(_prev: ThemeState, formData: FormData): Promise<ThemeState> {
  const theme = formData.get("theme");
  if (!isThemeId(theme)) return { error: "Choose a theme." };

  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const { error } = await supabase.from("shop_settings").upsert({ id: 1, theme });
  if (error) {
    return {
      error: error.message.includes("shop_settings")
        ? "Settings table not found. Run supabase/migrations/003_shop_settings.sql in Supabase first."
        : error.message,
    };
  }

  updateTag("settings"); // storefront layout re-reads the theme on the next request
  revalidatePath("/admin/appearance");
  return { success: `${THEMES.find((t) => t.id === theme)?.name} is now live on the store.` };
}
