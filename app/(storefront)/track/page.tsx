import type { Metadata } from "next";
import { TrackForm } from "@/components/storefront/track-form";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Track order", robots: { index: false } };

export default async function TrackPage() {
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.track.title}</h1>
        <p className="text-muted-foreground">{t.track.intro}</p>
      </div>
      <TrackForm />
    </div>
  );
}
