import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Store contact numbers, the announcement bar and the home page banner, in English and Arabic. The theme is in
          Appearance.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CurrentSettings />
      </Suspense>
    </div>
  );
}

async function CurrentSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Couldn&apos;t read settings ({error.message}). Run the latest Supabase migrations.
        </p>
      )}
      <SettingsForm initial={data ?? {}} />
    </>
  );
}
