"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/guard";
import { getAdminT } from "@/lib/i18n/admin-server";

export type NoteState = { error?: string; success?: string };

export async function saveCustomerNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const key = String(formData.get("phone_key") ?? "");
  if (!/^\d{7,8}$/.test(key)) return { error: t.msg.invalidCustomer };
  const note = String(formData.get("note") ?? "").slice(0, 5000);

  const { error } = await supabase
    .from("customer_notes")
    .upsert({ phone_key: key, note, updated_at: new Date().toISOString() });
  if (error) {
    return {
      error: error.message.includes("customer_notes")
        ? t.msg.runMigration("006_cms_customers_multi_exchange.sql")
        : error.message,
    };
  }

  revalidatePath(`/admin/customers/${key}`);
  return { success: t.msg.noteSaved };
}
