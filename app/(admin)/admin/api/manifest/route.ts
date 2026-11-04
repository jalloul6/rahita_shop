import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

const HEADERS = [
  "Order #",
  "Customer",
  "Phone 1",
  "Phone 2",
  "Address",
  "Zone",
  "Items",
  "Amount to collect (COD)",
  "Notes",
];

// Daily manifest for the courier: every order currently "Out for Delivery".
export async function GET() {
  const supabase = await createClient();

  // proxy.ts already guards /admin/*, but re-check here: route handlers are public endpoints.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return new Response("Forbidden", { status: 403 });

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "order_number, customer_name, phone1, phone2, address, total_amount, notes, shipping_zones(zone_name), order_items(product_name, quantity)"
    )
    .eq("status", "out_for_delivery")
    .order("order_number", { ascending: true });

  if (error) return new Response(`Failed to load orders: ${error.message}`, { status: 500 });

  const rows = orders.map((o) => [
    o.order_number,
    o.customer_name,
    o.phone1,
    o.phone2,
    o.address,
    o.shipping_zones?.zone_name,
    o.order_items.map((i) => `${i.quantity} x ${i.product_name}`).join("; "),
    o.total_amount.toFixed(2),
    o.notes,
  ]);

  const csv = toCsv(HEADERS, rows, [2, 3]);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="manifest-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
