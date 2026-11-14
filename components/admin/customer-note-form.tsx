"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminT } from "@/lib/i18n/admin-client";
import { saveCustomerNote, type NoteState } from "@/app/(admin)/admin/customers/actions";

export function CustomerNoteForm({ phoneKey, note }: { phoneKey: string; note: string }) {
  const { t } = useAdminT();
  const [state, action, pending] = useActionState<NoteState, FormData>(saveCustomerNote, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="phone_key" value={phoneKey} />
      <Textarea
        name="note"
        rows={5}
        defaultValue={note}
        placeholder={t.customers.notePlaceholder}
        aria-label={t.customers.noteAria}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.customers.saveNote}
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}
