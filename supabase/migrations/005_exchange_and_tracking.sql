-- Rahita migration 005: product exchanges and customer order tracking
-- Run AFTER 004. Safe to re-run. Does NOT delete data.

-- Order items added by an exchange (shown as "exchange" on the receipt)
alter table public.order_items
  add column if not exists from_exchange boolean not null default false;

-- One row per exchange: what came back, what went out, and the price difference
create table if not exists public.order_exchanges (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  returned_item_id      uuid not null references public.order_items(id) on delete cascade,
  returned_product_name text not null,
  returned_quantity     integer not null check (returned_quantity > 0),
  returned_value        numeric(10,2) not null,
  restocked             boolean not null,
  new_item_id           uuid references public.order_items(id) on delete set null,
  new_product_name      text not null,
  new_quantity          integer not null check (new_quantity > 0),
  new_value             numeric(10,2) not null,
  -- new_value - returned_value: positive = collect from customer, negative = refund to customer
  price_difference      numeric(10,2) not null,
  reason                text,
  created_by            uuid default auth.uid() references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);
create index if not exists order_exchanges_order_idx on public.order_exchanges (order_id);

alter table public.order_exchanges enable row level security;

drop policy if exists "order_exchanges_admin_all" on public.order_exchanges;
create policy "order_exchanges_admin_all" on public.order_exchanges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Exchange: return N units of one line (optionally restock), send M units of another product.
-- The order subtotal and total move by the price difference, so net revenue follows it
-- automatically (more expensive item = more revenue, cheaper item = less).

create or replace function public.process_exchange(
  p_order_id       uuid,
  p_order_item_id  uuid,
  p_return_qty     integer,
  p_restock        boolean,
  p_new_product_id uuid,
  p_new_qty        integer,
  p_reason         text default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_order       record;
  v_old_product uuid;
  v_old_name    text;
  v_old_price   numeric(10,2);
  v_new_price   numeric(10,2);
  v_new_name    text;
  v_new_item    uuid;
  v_returned    numeric(10,2);
  v_new_value   numeric(10,2);
  v_diff        numeric(10,2);
  v_exchange_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if coalesce(p_return_qty, 0) <= 0 or coalesce(p_new_qty, 0) <= 0 then
    raise exception 'Quantities must be at least 1';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.status in ('canceled', 'returned') then
    raise exception 'This order is % and cannot be exchanged', v_order.status;
  end if;
  if not (v_order.status in ('delivered', 'partially_returned') or v_order.payment_status = 'paid') then
    raise exception 'Only delivered or paid orders can be exchanged';
  end if;

  update public.order_items
     set returned_quantity = returned_quantity + p_return_qty
   where id = p_order_item_id
     and order_id = p_order_id
     and returned_quantity + p_return_qty <= quantity
  returning product_id, product_name, unit_price into v_old_product, v_old_name, v_old_price;
  if not found then
    raise exception 'Exchange quantity is more than what is left on the order';
  end if;

  if coalesce(p_restock, true) then
    update public.products set stock_quantity = stock_quantity + p_return_qty where id = v_old_product;
  end if;

  update public.products
     set stock_quantity = stock_quantity - p_new_qty
   where id = p_new_product_id
     and stock_quantity >= p_new_qty
  returning price, name into v_new_price, v_new_name;
  if not found then
    raise exception 'Not enough stock for the replacement product';
  end if;

  v_returned  := round(p_return_qty * v_old_price, 2);
  v_new_value := round(p_new_qty * v_new_price, 2);
  v_diff      := v_new_value - v_returned;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, from_exchange)
  values (p_order_id, p_new_product_id, v_new_name, p_new_qty, v_new_price, true)
  returning id into v_new_item;

  update public.orders
     set subtotal = subtotal + v_diff,
         total_amount = total_amount + v_diff
   where id = p_order_id;

  insert into public.order_exchanges (order_id, returned_item_id, returned_product_name, returned_quantity,
                                      returned_value, restocked, new_item_id, new_product_name, new_quantity,
                                      new_value, price_difference, reason)
  values (p_order_id, p_order_item_id, v_old_name, p_return_qty, v_returned, coalesce(p_restock, true),
          v_new_item, v_new_name, p_new_qty, v_new_value, v_diff, nullif(trim(coalesce(p_reason, '')), ''))
  returning id into v_exchange_id;

  return json_build_object('exchange_id', v_exchange_id, 'price_difference', v_diff);
exception
  when check_violation then
    raise exception 'This exchange would push the order total below its discount or refunds already given';
end
$$;

revoke all on function public.process_exchange(uuid, uuid, integer, boolean, uuid, integer, text) from public;
grant execute on function public.process_exchange(uuid, uuid, integer, boolean, uuid, integer, text) to authenticated;

-- Customer tracking: returns a safe summary ONLY when the reference and phone match.
-- Reference: "RH-1042" or "1042" (the app shows 1000 + order_number; keep in sync with lib/orders.ts).
-- Phone: compared on the last 8 digits so "70 123 456", "+961 70123456" and "96170123456" all match.
-- No name, address or phone is returned, and the orders table stays private.

create or replace function public.track_order(p_ref text, p_phone text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_digits text := regexp_replace(coalesce(p_ref, ''), '\D', '', 'g');
  v_phone  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_number bigint;
  v_order  record;
begin
  if length(v_digits) < 4 or length(v_digits) > 12 or length(v_phone) < 7 then
    return null;
  end if;
  v_number := v_digits::bigint - 1000;
  if v_number < 1 then
    return null;
  end if;

  select o.* into v_order
    from public.orders o
   where o.order_number = v_number
     and (right(regexp_replace(o.phone1, '\D', '', 'g'), 8) = right(v_phone, 8)
          or right(regexp_replace(coalesce(o.phone2, ''), '\D', '', 'g'), 8) = right(v_phone, 8));
  if not found then
    return null;
  end if;

  return json_build_object(
    'ref', 'RH-' || (v_order.order_number + 1000),
    'status', v_order.status,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'order_source', v_order.order_source,
    'created_at', v_order.created_at,
    'subtotal', v_order.subtotal,
    'discount_amount', v_order.discount_amount,
    'shipping_fee', v_order.shipping_fee,
    'total_amount', v_order.total_amount,
    'refunded_amount', v_order.refunded_amount,
    'zone', (select z.zone_name from public.shipping_zones z where z.id = v_order.shipping_zone_id),
    'items', (select coalesce(json_agg(json_build_object(
                        'name', oi.product_name,
                        'quantity', oi.quantity,
                        'returned_quantity', oi.returned_quantity) order by oi.from_exchange, oi.product_name), '[]'::json)
                from public.order_items oi
               where oi.order_id = v_order.id)
  );
end
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
