import "server-only";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One order with its zone and line items, or null if the id is malformed / not found.
export async function getOrder(id: string) {
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, phone1, phone2, address, status, subtotal, shipping_fee, total_amount, discount_amount, refunded_amount, shipping_refunded, order_source, promo_code, payment_method, payment_status, notes, created_at, updated_at, shipping_zones(zone_name), order_items(id, product_name, quantity, unit_price, returned_quantity, from_exchange), order_exchange_batches(id, created_at, returned_value, new_value, shipping_refund, price_difference, note, order_exchange_lines(id, direction, product_name, quantity, unit_price, restocked, reason)), order_exchanges(id, created_at, returned_product_name, returned_quantity, restocked, new_product_name, new_quantity, price_difference, reason), order_returns(id, created_at, reason, refund_amount, shipping_refund, restocked, order_return_items(order_item_id, quantity))"
    )
    .eq("id", id)
    .maybeSingle();

  return data;
}
