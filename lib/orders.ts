import type { OrderStatus, PaymentMethod } from "@/types/database";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  whish: "Whish Money",
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
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
];

// Happy path shown in the stepper.
export const FLOW: OrderStatus[] = ["pending", "processing", "out_for_delivery", "delivered"];

// Allowed moves from each status. Canceled and Returned are final (also enforced by a DB trigger).
export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["processing", "canceled"];
    case "processing":
      return ["out_for_delivery", "canceled"];
    case "out_for_delivery":
      return ["delivered", "returned"];
    case "delivered":
      return ["returned"];
    default:
      return [];
  }
}

export const ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Mark pending",
  processing: "Start processing",
  out_for_delivery: "Send out for delivery",
  delivered: "Mark delivered",
  returned: "Mark returned",
  canceled: "Cancel order",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.some((s) => s.value === value);
}

export function statusLabel(status: OrderStatus) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
}
