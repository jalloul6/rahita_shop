import { Suspense } from "react";
import type { Metadata } from "next";
import { CreateZoneForm, ZoneRow } from "@/components/admin/zone-forms";
import { getAdminZones } from "@/lib/data/zones";

export const metadata: Metadata = { title: "Shipping Zones" };

export default function ZonesPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shipping Zones</h1>
        <p className="text-sm text-muted-foreground">
          Customers pick a zone at checkout; its fee is added to the order. Existing orders keep the fee they were placed with.
        </p>
      </div>
      <CreateZoneForm />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading zones…</p>}>
        <ZoneList />
      </Suspense>
    </div>
  );
}

async function ZoneList() {
  const { zones, error } = await getAdminZones();

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load zones: {error}
      </p>
    );
  }
  if (zones.length === 0) {
    return <p className="text-sm text-muted-foreground">No zones yet. Add one above; checkout needs at least one.</p>;
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {zones.map((zone) => (
        <ZoneRow key={zone.id} zone={zone} />
      ))}
    </div>
  );
}
