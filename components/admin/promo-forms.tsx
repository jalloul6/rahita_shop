"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminT } from "@/lib/i18n/admin-client";
import { createPromo, deletePromo, type PromoState } from "@/app/(admin)/admin/promos/actions";

export function CreatePromoForm() {
  const { t } = useAdminT();
  const x = t.promos;
  const [state, action, pending] = useActionState<PromoState, FormData>(createPromo, {});

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-medium">{x.newCode}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="promo-code">{x.code}</Label>
          <Input id="promo-code" name="code" required maxLength={30} placeholder={x.placeholder} dir="ltr" className="uppercase" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-type">{x.type}</Label>
          <select
            id="promo-type"
            name="discount_type"
            defaultValue="percentage"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="percentage">{x.percentage}</option>
            <option value="fixed">{x.fixed}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-value">{x.value}</Label>
          <Input id="promo-value" name="discount_value" inputMode="decimal" required placeholder="10" />
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          {pending ? x.adding : x.addButton}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked className="size-4 accent-primary" />
        {x.activeNow}
      </label>
      {state.error && (
        <p role="alert" className="whitespace-pre-line text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
    </form>
  );
}

export function DeletePromoButton({ id, code }: { id: string; code: string }) {
  const { t } = useAdminT();
  return (
    <form action={deletePromo}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        aria-label={t.promos.deleteAria(code)}
        onClick={(e) => {
          if (!window.confirm(t.promos.confirmDelete(code))) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
