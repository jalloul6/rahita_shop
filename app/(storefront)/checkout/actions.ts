"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { orderRef } from "@/lib/orders";
import { createPublicClient } from "@/lib/supabase/public";
import type { DiscountType } from "@/types/database";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};

const PHONE = /^[0-9+ ()-]{7,20}$/;

// Built per request so validation messages come back in the customer's language.
function checkoutSchema(t: Dictionary) {
  return z.object({
    customer_name: z.string().trim().min(2, t.errors.nameRequired).max(100),
    phone1: z.string().trim().regex(PHONE, t.errors.phoneInvalid),
    phone2: z
      .string()
      .trim()
      .refine((v) => v === "" || PHONE.test(v), t.errors.phoneInvalid)
      .transform((v) => v || null),
    address: z.string().trim().min(5, t.errors.addressRequired).max(500),
    shipping_zone_id: z.uuid(t.errors.areaRequired),
    notes: z
      .string()
      .trim()
      .max(500)
      .transform((v) => v || null),
    payment_method: z.enum(["cod", "whish"], { error: t.errors.paymentRequired }),
    promo_code: z
      .string()
      .trim()
      .max(30)
      .transform((v) => v.toUpperCase() || null),
  });
}

const itemsSchema = z
  .array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(99) }))
  .min(1)
  .max(50);

const FIELDS = [
  "customer_name",
  "phone1",
  "phone2",
  "address",
  "shipping_zone_id",
  "notes",
  "payment_method",
  "promo_code",
] as const;

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const t = await getDictionary();
  const values: Record<string, string> = {};
  for (const f of FIELDS) values[f] = String(formData.get(f) ?? "");

  // Honeypot: real users never fill this hidden field. Pretend success to bots.
  if (String(formData.get("website") ?? "") !== "") redirect("/order-confirmed/received");

  const parsed = checkoutSchema(t).safeParse(values);
  if (!parsed.success) {
    return { error: t.errors.fixFields, fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let items;
  try {
    const itemsParsed = itemsSchema.safeParse(JSON.parse(String(formData.get("items") ?? "[]")));
    if (!itemsParsed.success) return { error: t.errors.cartInvalid, values };
    items = itemsParsed.data;
  } catch {
    return { error: t.errors.cartInvalid, values };
  }

  // Prices, fee, discount and stock are all recomputed inside the place_order database
  // function; nothing the browser sends about money is trusted.
  const { data, error } = await createPublicClient().rpc("place_order", {
    p_customer_name: parsed.data.customer_name,
    p_phone1: parsed.data.phone1,
    p_phone2: parsed.data.phone2,
    p_address: parsed.data.address,
    p_shipping_zone_id: parsed.data.shipping_zone_id,
    p_items: items,
    p_notes: parsed.data.notes,
    p_payment_method: parsed.data.payment_method,
    p_promo_code: parsed.data.promo_code,
  });

  if (error || !data?.[0]) {
    const msg = error?.message ?? "";
    if (msg.includes("insufficient stock")) return { error: t.errors.stock, values };
    if (msg.includes("shipping zone")) return { error: t.errors.zoneGone, values };
    if (msg.includes("promo code")) return { error: t.errors.promoGone, values };
    console.error("place_order failed", error);
    return { error: t.errors.generic, values };
  }

  updateTag("products"); // stock changed

  const { order_number, total_amount } = data[0];
  const params = new URLSearchParams({ pm: parsed.data.payment_method, total: Number(total_amount).toFixed(2) });
  // Customers only ever see the RH- reference, never the raw sequence number.
  redirect(`/order-confirmed/${orderRef(order_number)}?${params}`);
}

export type PromoResult =
  | { ok: true; code: string; discount_type: DiscountType; discount_value: number }
  | { ok: false; error: string };

// Checkout "Apply" button. The discount shown is a preview; place_order recomputes it.
export async function checkPromoCode(rawCode: string): Promise<PromoResult> {
  const t = await getDictionary();
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: t.errors.promoFormat };

  const { data, error } = await createPublicClient().rpc("validate_promo_code", { p_code: code });
  if (error) {
    console.error("validate_promo_code failed", error);
    return { ok: false, error: t.errors.promoCheckFailed };
  }
  const promo = data?.[0];
  if (!promo) return { ok: false, error: t.errors.promoInvalid };

  return {
    ok: true,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: Number(promo.discount_value),
  };
}
