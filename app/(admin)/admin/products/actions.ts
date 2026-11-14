"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ProductFormState } from "@/lib/products";
import { getAdminClient } from "@/lib/supabase/guard";
import { productSchema } from "@/lib/validators";
import { getAdminT } from "@/lib/i18n/admin-server";

const FIELDS = ["name", "description", "price", "compare_at_price", "stock_quantity", "category", "image_url"] as const;
const CHECKBOXES = ["is_sponsored", "is_active", "is_on_offer"] as const;

function readForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const f of FIELDS) values[f] = String(formData.get(f) ?? "");
  const checks = Object.fromEntries(CHECKBOXES.map((c) => [c, formData.get(c) === "on"])) as Record<
    (typeof CHECKBOXES)[number],
    boolean
  >;
  return {
    // values are echoed back to the form when validation fails
    values: { ...values, ...Object.fromEntries(CHECKBOXES.map((c) => [c, checks[c] ? "on" : ""])) },
    raw: { ...values, ...checks },
  };
}

async function save(formData: FormData, id: string | null): Promise<ProductFormState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const { values, raw } = readForm(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: t.msg.fixFields,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  const { error } = id
    ? await supabase.from("products").update(parsed.data).eq("id", id)
    : await supabase.from("products").insert(parsed.data);

  if (error) return { error: error.message, values };

  revalidatePath("/admin/products");
  updateTag("products");
  redirect("/admin/products");
}

export async function createProduct(_prev: ProductFormState, formData: FormData) {
  return save(formData, null);
}

export async function updateProduct(_prev: ProductFormState, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: (await getAdminT()).msg.missingId };
  return save(formData, id);
}

export async function deleteProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    // 23503 = foreign key violation: the product appears in past orders.
    return {
      error:
        error.code === "23503"
          ? t.msg.productInOrders
          : error.message,
    };
  }

  revalidatePath("/admin/products");
  updateTag("products");
  redirect("/admin/products");
}

// Quick toggles from the list view.
export async function setSponsored(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  if (!supabase) return;
  await supabase
    .from("products")
    .update({ is_sponsored: formData.get("value") === "true" })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/products");
  updateTag("products");
}

export async function setActive(formData: FormData): Promise<void> {
  const supabase = await getAdminClient();
  if (!supabase) return;
  await supabase
    .from("products")
    .update({ is_active: formData.get("value") === "true" })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin/products");
  updateTag("products");
}
