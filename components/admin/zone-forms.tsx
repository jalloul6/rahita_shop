"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZone, deleteZone, updateZone, type ZoneState } from "@/app/(admin)/admin/zones/actions";

function Message({ state }: { state: ZoneState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state.success) return <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>;
  return null;
}

export function CreateZoneForm() {
  const [state, action, pending] = useActionState<ZoneState, FormData>(createZone, {});

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-medium">Add a zone</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="new-zone-name">Zone name</Label>
          <Input id="new-zone-name" name="zone_name" required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-zone-fee">Delivery fee</Label>
          <Input id="new-zone-fee" name="delivery_fee" inputMode="decimal" required />
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? "Adding…" : "Add zone"}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked className="size-4 accent-primary" />
        Active (shown at checkout)
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
  const [saveState, saveAction, saving] = useActionState<ZoneState, FormData>(updateZone, {});
  const [delState, deleteAction, deleting] = useActionState<ZoneState, FormData>(deleteZone, {});
  const busy = saving || deleting;

  return (
    <form action={saveAction} className="space-y-2 px-4 py-3">
      <input type="hidden" name="id" value={zone.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-center">
        <Input name="zone_name" aria-label="Zone name" required maxLength={100} defaultValue={zone.zone_name} />
        <Input
          name="delivery_fee"
          aria-label="Delivery fee"
          inputMode="decimal"
          required
          defaultValue={String(zone.delivery_fee)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="size-4 accent-primary" />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="text-destructive"
            formAction={deleteAction}
            disabled={busy}
            aria-label={`Delete ${zone.zone_name}`}
            onClick={(e) => {
              if (!window.confirm(`Delete zone "${zone.zone_name}"?`)) e.preventDefault();
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
