"use server";

import { revalidatePath, updateTag } from "next/cache";
import { allowedTransitions, isOrderStatus } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/guard";
import { getAdminT } from "@/lib/i18n/admin-server";

export type StatusState = { error?: string; success?: string };

export async function updateOrderStatus(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const orderId = String(formData.get("orderId") ?? "");
  const target = formData.get("status");
  const t = await getAdminT();
  if (!orderId || !isOrderStatus(target)) return { error: t.msg.invalidRequest };

  const supabase = await createClient();

  // Server actions are public endpoints: authorize here, not just in the proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t.msg.signedOut };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: t.msg.notAuthorized };

  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) return { error: t.msg.orderNotFound };
  if (!allowedTransitions(order.status).includes(target)) {
    return { error: t.msg.badTransition(t.status[order.status], t.status[target]) };
  }

  // Match on the status we just read so two admins can't both apply a stale change.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: target })
    .eq("id", orderId)
    .eq("status", order.status)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: t.msg.staleOrder };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  updateTag("products"); // cancel / return restores stock
  return { success: t.msg.statusUpdated };
}

export async function updatePaymentStatus(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const orderId = String(formData.get("orderId") ?? "");
  const target = formData.get("payment_status");
  const t = await getAdminT();
  if (!orderId || (target !== "paid" && target !== "pending")) return { error: t.msg.invalidRequest };

  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: target })
    .eq("id", orderId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: t.msg.orderNotFound };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: target === "paid" ? t.msg.markedPaid : t.msg.markedUnpaid };
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
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const items = (input.items ?? []).filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
  if (items.length === 0) return { error: t.returns.chooseItem };
  const refund = Math.round((Number(input.refundAmount) || 0) * 100) / 100;
  if (refund < 0) return { error: t.msg.negativeRefund };

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
        ? t.msg.runMigration("006_cms_customers_multi_exchange.sql")
        : error.message,
    };
  }

  if (input.restock) updateTag("products"); // stock went back up
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  return { success: t.msg.returnRecorded };
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
  const t = await getAdminT();
  const supabase = await getAdminClient();
  if (!supabase) return { error: t.msg.notAuthorized };

  const returns = (input.returns ?? [])
    .filter((r) => Number.isInteger(r.quantity) && r.quantity > 0)
    .map((r) => ({ order_item_id: r.order_item_id, quantity: r.quantity, restock: Boolean(r.restock), reason: r.reason?.trim().slice(0, 300) || null }));
  const newItems = (input.newItems ?? []).filter((n) => Number.isInteger(n.quantity) && n.quantity > 0);
  if (returns.length === 0) return { error: t.exchange.chooseReturn };
  if (newItems.length === 0) return { error: t.exchange.addReplacement };

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
        ? t.msg.runMigration("006_cms_customers_multi_exchange.sql")
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
        ? t.msg.exchangeCollect(`$${diff.toFixed(2)}`)
        : diff < 0
          ? t.msg.exchangeRefund(`$${Math.abs(diff).toFixed(2)}`)
          : t.msg.exchangeEven,
  };
}
