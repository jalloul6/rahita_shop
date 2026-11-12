import type { DiscountType } from "@/types/database";

// Mirrors the calculation in place_order(): discount applies to the products subtotal only.
export function computeDiscount(subtotal: number, type: DiscountType, value: number) {
  const raw = type === "percentage" ? (subtotal * value) / 100 : value;
  return Math.round(Math.min(raw, subtotal) * 100) / 100;
}
