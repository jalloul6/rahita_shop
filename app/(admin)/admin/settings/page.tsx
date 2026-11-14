import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";
import { getAdminT } from "@/lib/i18n/admin-server";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <CurrentSettings />
      </Suspense>
    </div>
  );
}

async function CurrentSettings() {
  const t = await getAdminT();
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {t.settings.readError(error.message)}
        </p>
      )}
      <SettingsForm initial={data ?? {}} />
    </>
  );
}
