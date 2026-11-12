import { Suspense } from "react";
import type { Metadata } from "next";
import { ThemePicker } from "@/components/admin/theme-picker";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME, isThemeId } from "@/lib/themes";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearancePage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Choose the storefront theme. It changes colors, fonts and corners across the store; the admin area keeps its
          own neutral look.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CurrentTheme />
      </Suspense>
    </div>
  );
}

async function CurrentTheme() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_settings").select("theme").eq("id", 1).maybeSingle();

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Couldn&apos;t read the saved theme ({error.message}). Run supabase/migrations/003_shop_settings.sql in Supabase.
        </p>
      )}
      <ThemePicker current={isThemeId(data?.theme) ? data.theme : DEFAULT_THEME} />
    </>
  );
}
