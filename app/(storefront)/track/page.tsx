import type { Metadata } from "next";
import { TrackForm } from "@/components/storefront/track-form";
import { getShopSettings } from "@/lib/data/storefront";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { brandFor } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await getLocale()];
  return { title: t.track.title, robots: { index: false } };
}

export default async function TrackPage() {
  const [settings, locale] = await Promise.all([getShopSettings(), getLocale()]);
  const t = dictionaries[locale];
  const brand = brandFor(settings, locale);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          {brand.name} · {brand.tagline}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.track.title}</h1>
        <p className="text-muted-foreground">{t.track.intro}</p>
      </div>
      <TrackForm />
    </div>
  );
}
