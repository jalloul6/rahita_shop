"use server";

import { revalidatePath, updateTag } from "next/cache";
import { allowedTransitions, isOrderStatus } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/guard";

export type StatusState = { error?: string; success?: string };

export async function updateOrderStatus(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const orderId = String(formData.get("orderId") ?? "");
  const target = formData.get("status");
  if (!orderId || !isOrderStatus(target)) return { error: "Invalid request." };

  const supabase = await createClient();

  // Server actions are public endpoints: authorize here, not just in the proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Please log in again." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Not authorized." };

  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) return { error: "Order not found." };
  if (!allowedTransitions(order.status).includes(target)) {
    return { error: `Cannot move an order from ${order.status} to ${target}.` };
  }

  // Match on the status we just read so two admins can't both apply a stale change.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: target })
    .eq("id", orderId)
    .eq("status", order.status)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Order was changed by someone else. Refresh and retry." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  updateTag("products"); // cancel / return restores stock
  return { success: "Status updated." };
}

export async function updatePaymentStatus(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const orderId = String(formData.get("orderId") ?? "");
  const target = formData.get("payment_status");
  if (!orderId || (target !== "paid" && target !== "pending")) return { error: "Invalid request." };

  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: target })
    .eq("id", orderId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Order not found." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: target === "paid" ? "Marked as paid." : "Marked as unpaid." };
}

export type ReturnInput = {
  orderId: string;
  items: { order_item_id: string; quantity: number }[];
  restock: boolean;
  refundAmount: number; // items part; the shipping fee is added by the database when refundShipping is set
  reason: string;
  refundShipping: boolean;
};

// Return / Refund: partial or full. Quantities, refund cap and restocking are enforced in process_return().
export async function processReturn(input: ReturnInput): Promise<StatusState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const items = (input.items ?? []).filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
  if (items.length === 0) return { error: "Choose at least one item to return." };
  const refund = Math.round((Number(input.refundAmount) || 0) * 100) / 100;
  if (refund < 0) return { error: "Refund amount cannot be negative." };

  const { error } = await supabase.rpc("process_return", {
    p_order_id: input.orderId,
    p_items: items,
    p_restock: Boolean(input.restock),
    p_refund_amount: refund,
    p_reason: input.reason?.trim() || null,
    p_refund_shipping: Boolean(input.refundShipping),
  });
  if (error) {
    return {
      error: error.message.includes("process_return")
        ? "Run supabase/migrations/006_cms_customers_multi_exchange.sql in Supabase first."
        : error.message,
    };
  }

  if (input.restock) updateTag("products"); // stock went back up
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  return { success: "Return recorded." };
}

export type ExchangeInput = {
  orderId: string;
  returns: { order_item_id: string; quantity: number; restock: boolean; reason: string }[];
  newItems: { product_id: string; quantity: number }[];
  refundShipping: boolean;
  note: string;
};

// Multi-item exchange: several returned lines (each with its own restock + reason) for several
// new products. Stock, price difference, shipping refund and the order total are updated together
// in process_exchange_multi().
export async function processExchange(input: ExchangeInput): Promise<StatusState> {
  const supabase = await getAdminClient();
  if (!supabase) return { error: "Not authorized. Please sign in again." };

  const returns = (input.returns ?? [])
    .filter((r) => Number.isInteger(r.quantity) && r.quantity > 0)
    .map((r) => ({ order_item_id: r.order_item_id, quantity: r.quantity, restock: Boolean(r.restock), reason: r.reason?.trim().slice(0, 300) || null }));
  const newItems = (input.newItems ?? []).filter((n) => Number.isInteger(n.quantity) && n.quantity > 0);
  if (returns.length === 0) return { error: "Choose at least one item the customer is returning." };
  if (newItems.length === 0) return { error: "Add at least one replacement item." };

  const { data, error } = await supabase.rpc("process_exchange_multi", {
    p_order_id: input.orderId,
    p_returns: returns,
    p_new_items: newItems,
    p_refund_shipping: Boolean(input.refundShipping),
    p_note: input.note?.trim() || null,
  });
  if (error) {
    return {
      error: error.message.includes("process_exchange_multi")
        ? "Run supabase/migrations/006_cms_customers_multi_exchange.sql in Supabase first."
        : error.message,
    };
  }

  updateTag("products"); // both products' stock changed
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  const diff = Number(data?.price_difference ?? 0);
  return {
    success:
      diff > 0
        ? `Exchange recorded. Collect $${diff.toFixed(2)} from the customer.`
        : diff < 0
          ? `Exchange recorded. Refund $${Math.abs(diff).toFixed(2)} to the customer.`
          : "Exchange recorded. No price difference.",
  };
}
