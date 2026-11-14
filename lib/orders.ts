import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from "@/types/database";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  whish: "Whish Money",
  cash: "Cash",
};

// What the courier must collect: nothing if already paid (e.g. Whish transfer confirmed).
export function amountToCollect(order: { total_amount: number; payment_status: string }) {
  return order.payment_status === "paid" ? 0 : order.total_amount;
}

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "partially_returned", label: "Partially Returned" },
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
];

// Happy path shown in the stepper.
export const FLOW: OrderStatus[] = ["pending", "processing", "out_for_delivery", "delivered"];

// Allowed status-button moves. Canceled and Returned are final (also enforced by a DB trigger).
// Delivered / paid orders go back through Return / Refund (process_return), not a status button;
// "returned" here is for parcels the courier brings back undelivered.
export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["processing", "canceled"];
    case "processing":
      return ["out_for_delivery", "canceled"];
    case "out_for_delivery":
      return ["delivered", "returned"];
    default:
      return [];
  }
}

export const ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Mark pending",
  processing: "Start processing",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark delivered",
  partially_returned: "Partially returned",
  returned: "Mark returned",
  canceled: "Cancel order",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.some((s) => s.value === value);
}

export function statusLabel(status: OrderStatus) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Customer-facing order reference. The sequence number is offset so early orders don't read
// as "#1"; admin, receipt and manifest use the same format so everyone quotes one reference.
export const ORDER_REF_PREFIX = "RH-";
const ORDER_REF_OFFSET = 1000;

export function orderRef(orderNumber: number) {
  return `${ORDER_REF_PREFIX}${ORDER_REF_OFFSET + orderNumber}`;
}

// "RH-1042" -> true (format check only; the page never looks the order up)
export function isOrderRef(value: string) {
  return /^RH-\d{4,12}$/.test(value);
}

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  online: "Online",
  in_store: "In-store",
  phone: "Phone / WhatsApp",
};

// Exchange price difference for the admin: positive = collect, negative = refund.
export function exchangeMoney(diff: number) {
  const amount = `$${Math.abs(diff).toFixed(2)}`;
  return diff > 0 ? `Collected ${amount}` : diff < 0 ? `Refunded ${amount}` : "No price difference";
}

// Return / Refund is offered for delivered or paid orders that still have units to return.
// Mirrors the checks in process_return().
export function canReturn(order: { status: OrderStatus; payment_status: PaymentStatus }) {
  if (order.status === "canceled" || order.status === "returned") return false;
  return order.status === "delivered" || order.status === "partially_returned" || order.payment_status === "paid";
}
