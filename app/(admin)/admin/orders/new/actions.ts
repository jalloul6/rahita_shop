"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/guard";
import { getAdminT } from "@/lib/i18n/admin-server";
import { issuesMessage } from "@/lib/i18n/admin";
import type { CustomerRow, DiscountType } from "@/types/database";

const inputSchema = z.object({
  source: z.enum(["in_store", "phone"]),
  customer_name: z.string().trim().max(100),
  phone1: z.string().trim().max(20),
  phone2: z.string().trim().max(20),
  address: z.string().trim().max(500),
  shipping_zone_id: z.string().trim(),
  payment_method: z.enum(["cash", "whish", "cod"]),
  promo_code: z.string().trim().max(30),
  manual_discount: z.number().min(0).max(1_000_000),
  notes: z.string().trim().max(500),
  items: z
    .array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(999) }))
    .min(1, "Add at least one product")
    .max(100),
});

export type ManualOrderInput = z.input<typeof inputSchema>;

// Creates the order through admin_create_order() (prices, stock and discounts are computed in
// the database), then opens its receipt. Returns an error message instead when anything fails.
export async function createManualOrder(input: ManualOrderInput): Promise<{ error: string }> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: issuesMessage(parsed.error.issues, t) };
  const d = parsed.data;

  const { data, error } = await supabase.rpc("admin_create_order", {
    p_source: d.source,
    p_customer_name: d.customer_name,
    p_phone1: d.phone1,
    p_phone2: d.phone2 || null,
    p_address: d.address,
    p_shipping_zone_id: d.source === "phone" && d.shipping_zone_id ? d.shipping_zone_id : null,
    p_items: d.items,
    p_payment_method: d.payment_method,
    p_promo_code: d.promo_code || null,
    p_manual_discount: d.manual_discount,
    p_notes: d.notes || null,
  });

  if (error || !data?.[0]) {
    const msg = error?.message ?? "";
    if (msg.includes("admin_create_order")) {
      return { error: t.msg.runMigration("004_manual_orders_returns.sql") };
    }
    if (msg.includes("Insufficient stock")) return { error: t.msg.notEnoughStock };
    return { error: msg || t.msg.createOrderFailed };
  }

  updateTag("products"); // stock changed
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${data[0].order_id}/receipt`);
}

// POS "existing customer" lookup by name or phone.
export async function searchCustomers(query: string): Promise<CustomerRow[]> {
  const supabase = await getAdminClient();
  const q = String(query ?? "").trim().slice(0, 60);
  if (!supabase || q.length < 2) return [];
  const { data } = await supabase.rpc("admin_customers", { p_search: q, p_limit: 8 });
  return data ?? [];
}

export type AdminPromoResult =
  | { ok: true; code: string; discount_type: DiscountType; discount_value: number }
  | { ok: false; error: string };

export async function checkAdminPromo(rawCode: string): Promise<AdminPromoResult> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { ok: false, error: t.msg.notAuthorized };

  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: t.msg.validCode };

  const { data, error } = await supabase.rpc("validate_promo_code", { p_code: code });
  if (error) return { ok: false, error: error.message };
  const promo = data?.[0];
  if (!promo) return { ok: false, error: t.msg.invalidCode };
  return { ok: true, code: promo.code, discount_type: promo.discount_type, discount_value: Number(promo.discount_value) };
}
