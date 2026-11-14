"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminT } from "@/lib/i18n/admin-client";
import { createZone, deleteZone, updateZone, type ZoneState } from "@/app/(admin)/admin/zones/actions";

function Message({ state }: { state: ZoneState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm whitespace-pre-line text-destructive">
        {state.error}
      </p>
    );
  if (state.success) return <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>;
  return null;
}

export function CreateZoneForm() {
  const { t } = useAdminT();
  const z = t.zones;
  const [state, action, pending] = useActionState<ZoneState, FormData>(createZone, {});

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-medium">{z.addZone}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="new-zone-name">{z.zoneName}</Label>
          <Input id="new-zone-name" name="zone_name" required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-zone-fee">{z.deliveryFee}</Label>
          <Input id="new-zone-fee" name="delivery_fee" inputMode="decimal" required />
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? z.adding : z.addButton}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked className="size-4 accent-primary" />
        {z.activeCheckout}
      </label>
      <Message state={state} />
    </form>
  );
}

export function ZoneRow({
  zone,
}: {
  zone: { id: string; zone_name: string; delivery_fee: number; is_active: boolean };
}) {
  const { t } = useAdminT();
  const [saveState, saveAction, saving] = useActionState<ZoneState, FormData>(updateZone, {});
  const [delState, deleteAction, deleting] = useActionState<ZoneState, FormData>(deleteZone, {});
  const busy = saving || deleting;

  return (
    <form action={saveAction} className="space-y-2 px-4 py-3">
      <input type="hidden" name="id" value={zone.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-center">
        <Input name="zone_name" aria-label={t.zones.zoneName} required maxLength={100} defaultValue={zone.zone_name} />
        <Input
          name="delivery_fee"
          aria-label={t.zones.deliveryFee}
          inputMode="decimal"
          required
          defaultValue={String(zone.delivery_fee)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="size-4 accent-primary" />
          {t.common.active}
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {saving ? t.common.saving : t.common.save}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="text-destructive"
            formAction={deleteAction}
            disabled={busy}
            aria-label={t.zones.deleteAria(zone.zone_name)}
            onClick={(e) => {
              if (!window.confirm(t.zones.confirmDelete(zone.zone_name))) e.preventDefault();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <Message state={delState.error || delState.success ? delState : saveState} />
    </form>
  );
}
