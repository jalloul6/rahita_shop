import { Suspense } from "react";
import type { Metadata } from "next";
import { CreateZoneForm, ZoneRow } from "@/components/admin/zone-forms";
import { getAdminZones } from "@/lib/data/zones";
import { getAdminT } from "@/lib/i18n/admin-server";
import type { AdminDict } from "@/lib/i18n/admin";

export const metadata: Metadata = { title: "Shipping Zones" };

export default function ZonesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
      <Zones />
    </Suspense>
  );
}

async function Zones() {
  const t = await getAdminT();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.zones.title}</h1>
        <p className="text-sm text-muted-foreground">{t.zones.subtitle}</p>
      </div>
      <CreateZoneForm />
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.zones.loading}</p>}>
        <ZoneList t={t} />
      </Suspense>
    </div>
  );
}

async function ZoneList({ t }: { t: AdminDict }) {
  const { zones, error } = await getAdminZones();

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {t.common.couldNotLoad(t.zones.what, error)}
      </p>
    );
  }
  if (zones.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.zones.empty}</p>;
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {zones.map((zone) => (
        <ZoneRow key={zone.id} zone={zone} />
      ))}
    </div>
  );
}
