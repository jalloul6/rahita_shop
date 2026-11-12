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
