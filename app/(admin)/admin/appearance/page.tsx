import { Suspense } from "react";
import type { Metadata } from "next";
import { ThemePicker } from "@/components/admin/theme-picker";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME, isThemeId } from "@/lib/themes";
import { getAdminT } from "@/lib/i18n/admin-server";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearancePage() {
  return (
    <div className="max-w-5xl space-y-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <CurrentTheme />
      </Suspense>
    </div>
  );
}

async function CurrentTheme() {
  const t = await getAdminT();
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_settings").select("theme").eq("id", 1).maybeSingle();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.appearance.title}</h1>
        <p className="text-sm text-muted-foreground">{t.appearance.subtitle}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {t.appearance.readError(error.message)}
        </p>
      )}
      <ThemePicker current={isThemeId(data?.theme) ? data.theme : DEFAULT_THEME} />
    </>
  );
}
