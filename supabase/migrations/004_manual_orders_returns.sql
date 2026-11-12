-- Rahita migration 004: manual / in-store orders (POS) and returns & refunds
-- Run AFTER 003. Safe to re-run. Does NOT delete data.

-- New enum values (only used inside function bodies below, so this works in one run)
alter type public.order_status add value if not exists 'partially_returned';
alter type public.payment_method add value if not exists 'cash';

-- Orders: where the order came from, and how much was refunded

alter table public.orders
  add column if not exists order_source    text not null default 'online',
  add column if not exists refunded_amount numeric(10,2) not null default 0;

alter table public.orders drop constraint if exists orders_source_ok;
alter table public.orders add constraint orders_source_ok
  check (order_source in ('online', 'in_store', 'phone'));

alter table public.orders drop constraint if exists orders_refund_ok;
alter table public.orders add constraint orders_refund_ok
  check (refunded_amount >= 0 and refunded_amount <= total_amount);

-- In-store sales have no delivery zone
alter table public.orders alter column shipping_zone_id drop not null;

-- Order items: how many units came back

alter table public.order_items
  add column if not exists returned_quantity integer not null default 0;

alter table public.order_items drop constraint if exists order_items_returned_ok;
alter table public.order_items add constraint order_items_returned_ok
  check (returned_quantity >= 0 and returned_quantity <= quantity);

-- Return records (one per Return / Refund action) and their lines

create table if not exists public.order_returns (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  refund_amount numeric(10,2) not null default 0 check (refund_amount >= 0),
  restocked     boolean not null,
  reason        text,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists order_returns_order_idx on public.order_returns (order_id);

create table if not exists public.order_return_items (
  id            uuid primary key default gen_random_uuid(),
  return_id     uuid not null references public.order_returns(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  quantity      integer not null check (quantity > 0)
);
create index if not exists order_return_items_return_idx on public.order_return_items (return_id);

alter table public.order_returns      enable row level security;
alter table public.order_return_items enable row level security;

drop policy if exists "order_returns_admin_all" on public.order_returns;
create policy "order_returns_admin_all" on public.order_returns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_return_items_admin_all" on public.order_return_items;
create policy "order_return_items_admin_all" on public.order_return_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Status trigger: cancel / "Mark returned" restock only units not already returned

create or replace function public.handle_order_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('returned', 'canceled') then
    raise exception 'Order is % and cannot change status again', old.status;
  end if;

  if new.status = 'delivered' and new.payment_method = 'cod' then
    new.payment_status := 'paid';
  end if;

  if new.status in ('returned', 'canceled') then
    update public.products p
       set stock_quantity = p.stock_quantity + (oi.quantity - oi.returned_quantity)
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id
       and oi.quantity > oi.returned_quantity;
  end if;

  return new;
end
$$;

-- Admin POS: create an in-store sale or a phone / WhatsApp order
-- p_items: [{"product_id": "uuid", "quantity": 2}]

create or replace function public.admin_create_order(
  p_source           text,
  p_customer_name    text,
  p_phone1           text,
  p_phone2           text,
  p_address          text,
  p_shipping_zone_id uuid,
  p_items            jsonb,
  p_payment_method   text,
  p_promo_code       text default null,
  p_manual_discount  numeric default 0,
  p_notes            text default null
)
returns table (order_id uuid, order_number bigint, total_amount numeric)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_in_store boolean := p_source = 'in_store';
  v_fee      numeric(10,2) := 0;
  v_subtotal numeric(10,2) := 0;
  v_promo_d  numeric(10,2) := 0;
  v_manual   numeric(10,2) := round(coalesce(p_manual_discount, 0), 2);
  v_discount numeric(10,2);
  v_code     text;
  v_name     text := trim(coalesce(p_customer_name, ''));
  v_phone1   text := trim(coalesce(p_phone1, ''));
  v_phone2   text := nullif(trim(coalesce(p_phone2, '')), '');
  v_address  text := trim(coalesce(p_address, ''));
  v_order_id uuid;
  v_number   bigint;
  v_item     record;
  v_promo    record;
  v_price    numeric(10,2);
  v_pname    text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if coalesce(p_source, '') not in ('in_store', 'phone') then
    raise exception 'Invalid order type';
  end if;
  if coalesce(p_payment_method, '') not in ('cash', 'whish', 'cod') then
    raise exception 'Invalid payment method';
  end if;
  if v_in_store and p_payment_method = 'cod' then
    raise exception 'Cash on delivery is not available for in-store sales';
  end if;
  if v_manual < 0 then
    raise exception 'Manual discount cannot be negative';
  end if;
  if (v_phone1 <> '' and v_phone1 !~ '^[0-9+ ()-]{7,20}$') or (v_phone2 is not null and v_phone2 !~ '^[0-9+ ()-]{7,20}$') then
    raise exception 'Invalid phone number';
  end if;

  if v_in_store then
    if v_name = '' then v_name := 'Walk-in customer'; end if;
  else
    if length(v_name) < 2 then raise exception 'Customer name is required'; end if;
    if v_phone1 = '' then raise exception 'Phone number is required'; end if;
    if length(v_address) < 5 then raise exception 'Address is required'; end if;
    select z.delivery_fee into v_fee from public.shipping_zones z where z.id = p_shipping_zone_id;
    if not found then raise exception 'Choose a delivery zone'; end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product';
  end if;

  insert into public.orders (customer_name, phone1, phone2, address, shipping_zone_id, subtotal, shipping_fee,
                             total_amount, notes, payment_method, payment_status, status, order_source)
  values (v_name, v_phone1, v_phone2, v_address, case when v_in_store then null else p_shipping_zone_id end,
          0, v_fee, v_fee, nullif(trim(coalesce(p_notes, '')), ''), p_payment_method::public.payment_method,
          case when v_in_store then 'paid' else 'pending' end::public.payment_status,
          case when v_in_store then 'delivered' else 'pending' end::public.order_status,
          p_source)
  returning id, orders.order_number into v_order_id, v_number;

  for v_item in
    select (e->>'product_id')::uuid as product_id, sum((e->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if v_item.qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    -- Admin may sell hidden products in the shop, but never more than is in stock.
    update public.products
       set stock_quantity = stock_quantity - v_item.qty
     where id = v_item.product_id
       and stock_quantity >= v_item.qty
    returning price, name into v_price, v_pname;

    if not found then
      raise exception 'Insufficient stock for product %', v_item.product_id;
    end if;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_item.product_id, v_pname, v_item.qty, v_price);

    v_subtotal := v_subtotal + v_price * v_item.qty;
  end loop;

  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select pc.code, pc.discount_type, pc.discount_value into v_promo
      from public.promo_codes pc
     where pc.code = upper(trim(p_promo_code)) and pc.is_active;
    if not found then
      raise exception 'Invalid promo code';
    end if;
    v_promo_d := case when v_promo.discount_type = 'percentage'
                      then round(v_subtotal * v_promo.discount_value / 100, 2)
                      else v_promo.discount_value end;
    v_code := v_promo.code;
  end if;

  v_discount := least(v_subtotal, v_promo_d + v_manual);

  update public.orders
     set subtotal = v_subtotal,
         discount_amount = v_discount,
         promo_code = v_code,
         total_amount = v_subtotal - v_discount + v_fee
   where id = v_order_id;

  return query select v_order_id, v_number, (v_subtotal - v_discount + v_fee)::numeric;
end
$$;

revoke all on function public.admin_create_order(text, text, text, text, text, uuid, jsonb, text, text, numeric, text) from public;
grant execute on function public.admin_create_order(text, text, text, text, text, uuid, jsonb, text, text, numeric, text) to authenticated;

-- Returns & refunds: partial or full, optional restock, refund amount recorded on the order
-- p_items: [{"order_item_id": "uuid", "quantity": 1}]

create or replace function public.process_return(
  p_order_id      uuid,
  p_items         jsonb,
  p_restock       boolean,
  p_refund_amount numeric,
  p_reason        text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order     record;
  v_item      record;
  v_product   uuid;
  v_return_id uuid;
  v_refund    numeric(10,2) := round(coalesce(p_refund_amount, 0), 2);
  v_any       boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.status in ('canceled', 'returned') then
    raise exception 'This order is % and cannot be returned', v_order.status;
  end if;
  if not (v_order.status in ('delivered', 'partially_returned') or v_order.payment_status = 'paid') then
    raise exception 'Only delivered or paid orders can be returned';
  end if;
  if v_refund < 0 or v_refund > v_order.total_amount - v_order.refunded_amount then
    raise exception 'Refund amount cannot exceed % (what is left of the order total)', v_order.total_amount - v_order.refunded_amount;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Choose at least one item to return';
  end if;

  insert into public.order_returns (order_id, refund_amount, restocked, reason)
  values (p_order_id, v_refund, coalesce(p_restock, true), nullif(trim(coalesce(p_reason, '')), ''))
  returning id into v_return_id;

  for v_item in
    select (e->>'order_item_id')::uuid as id, sum((e->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
  loop
    continue when coalesce(v_item.qty, 0) <= 0;

    update public.order_items
       set returned_quantity = returned_quantity + v_item.qty
     where id = v_item.id
       and order_id = p_order_id
       and returned_quantity + v_item.qty <= quantity
    returning product_id into v_product;

    if not found then
      raise exception 'Return quantity is more than what is left on the order';
    end if;

    insert into public.order_return_items (return_id, order_item_id, quantity)
    values (v_return_id, v_item.id, v_item.qty);

    if coalesce(p_restock, true) then
      update public.products set stock_quantity = stock_quantity + v_item.qty where id = v_product;
    end if;

    v_any := true;
  end loop;

  if not v_any then
    raise exception 'Choose at least one item to return';
  end if;

  -- Everything back -> Returned (the status trigger restocks nothing more: no units remain).
  update public.orders
     set refunded_amount = refunded_amount + v_refund,
         status = case
                    when exists (select 1 from public.order_items
                                  where order_id = p_order_id and returned_quantity < quantity)
                    then 'partially_returned'
                    else 'returned'
                  end::public.order_status
   where id = p_order_id;

  return v_return_id;
end
$$;

revoke all on function public.process_return(uuid, jsonb, boolean, numeric, text) from public;
grant execute on function public.process_return(uuid, jsonb, boolean, numeric, text) to authenticated;

-- Dashboard KPIs: revenue is now NET of refunds; returned units leave the top-products list.
-- An order counts unless canceled, or returned by the courier without any refund recorded.

create or replace function public.admin_dashboard_stats(p_tz text default 'Asia/Beirut')
returns json
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_today date := (now() at time zone p_tz)::date;
  v_month date := date_trunc('month', now() at time zone p_tz)::date;
  v_kpis  json;
  v_top   json;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  with o as (
    select *,
           status <> 'canceled' and not (status = 'returned' and refunded_amount = 0) as counted,
           (created_at at time zone p_tz)::date as day
      from public.orders
  )
  select json_build_object(
    'total_sales', coalesce(sum(total_amount - refunded_amount) filter (
        where counted and (status in ('delivered', 'partially_returned', 'returned') or payment_status = 'paid')), 0),
    'refunds_total', coalesce(sum(refunded_amount), 0),
    'today_sales', coalesce(sum(total_amount - refunded_amount) filter (where counted and day = v_today), 0),
    'today_orders', count(*) filter (where day = v_today),
    'month_sales', coalesce(sum(total_amount - refunded_amount) filter (where counted and day >= v_month), 0),
    'month_orders', count(*) filter (where counted and day >= v_month),
    'pending', count(*) filter (where status = 'pending'),
    'processing', count(*) filter (where status = 'processing'),
    'out_for_delivery', count(*) filter (where status = 'out_for_delivery'),
    'unpaid_whish', count(*) filter (
        where payment_method = 'whish' and payment_status = 'pending'
          and status not in ('canceled', 'returned'))
  ) into v_kpis
  from o;

  select coalesce(json_agg(t), '[]'::json) into v_top
  from (
    select oi.product_id,
           max(oi.product_name) as name,
           sum(oi.quantity - oi.returned_quantity)::int as quantity,
           sum((oi.quantity - oi.returned_quantity) * oi.unit_price) as revenue
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where o.status not in ('canceled', 'returned')
     group by oi.product_id
    having sum(oi.quantity - oi.returned_quantity) > 0
     order by 3 desc, 4 desc
     limit 3
  ) t;

  return json_build_object('kpis', v_kpis, 'top_products', v_top);
end
$$;
