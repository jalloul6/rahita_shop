-- Rahita migration 006: storefront CMS & shop settings, compare-at prices & offers, customers,
-- multi-item exchanges and shipping refunds.
-- Run AFTER 005. Safe to re-run. Does NOT delete data.

-- Shop settings: contact / payment numbers, announcement bar, hero banner (EN + AR).
-- Empty values fall back to the defaults built into the app.

alter table public.shop_settings
  add column if not exists whatsapp_number      text,
  add column if not exists whish_number         text,
  add column if not exists instagram_url        text,
  add column if not exists copyright_en         text,
  add column if not exists copyright_ar         text,
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_en      text,
  add column if not exists announcement_ar      text,
  add column if not exists hero_image_url       text,
  add column if not exists hero_title_en        text,
  add column if not exists hero_title_ar        text,
  add column if not exists hero_text_en         text,
  add column if not exists hero_text_ar         text,
  add column if not exists hero_cta_en          text,
  add column if not exists hero_cta_ar          text,
  add column if not exists hero_cta_url         text;

-- Products: original price for sale display, and an "On offer" flag for the home offers section

alter table public.products
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists is_on_offer      boolean not null default false;

alter table public.products drop constraint if exists products_compare_at_ok;
alter table public.products add constraint products_compare_at_ok
  check (compare_at_price is null or compare_at_price > 0);

create index if not exists products_offer_idx on public.products (is_on_offer) where is_on_offer;

-- Orders / returns: remember shipping refunds so the delivery fee is never refunded twice

alter table public.orders
  add column if not exists shipping_refunded boolean not null default false;

alter table public.order_returns
  add column if not exists shipping_refund numeric(10,2) not null default 0;

-- Customer notes (customers themselves are derived from orders, keyed by the last 8 phone digits)

create table if not exists public.customer_notes (
  phone_key  text primary key check (phone_key ~ '^[0-9]{7,8}$'),
  note       text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.customer_notes enable row level security;

drop policy if exists "customer_notes_admin_all" on public.customer_notes;
create policy "customer_notes_admin_all" on public.customer_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customers list: one row per phone (walk-in sales without a phone are excluded).
-- Runs with the caller's rights, so only admins (orders RLS) get rows.

create or replace function public.admin_customers(p_search text default null, p_limit integer default 500)
returns table (
  phone_key     text,
  customer_name text,
  phone         text,
  phone2        text,
  zone_id       uuid,
  zone_name     text,
  address       text,
  orders_count  bigint,
  total_spent   numeric,
  last_order_at timestamptz
)
language sql stable security invoker set search_path = public
as $$
  with o as (
    select o.*, right(regexp_replace(o.phone1, '\D', '', 'g'), 8) as key
      from public.orders o
     where length(regexp_replace(o.phone1, '\D', '', 'g')) >= 7
  ),
  latest as (
    select distinct on (key) key, customer_name, phone1, phone2, shipping_zone_id, address
      from o
     order by key, created_at desc
  ),
  agg as (
    select key,
           count(*) as orders_count,
           coalesce(sum(total_amount - refunded_amount) filter (
             where status <> 'canceled' and not (status = 'returned' and refunded_amount = 0)), 0) as total_spent,
           max(created_at) as last_order_at
      from o
     group by key
  )
  select l.key, l.customer_name, l.phone1, l.phone2, l.shipping_zone_id, z.zone_name, l.address,
         a.orders_count, a.total_spent, a.last_order_at
    from latest l
    join agg a using (key)
    left join public.shipping_zones z on z.id = l.shipping_zone_id
   where coalesce(trim(p_search), '') = ''
      or l.customer_name ilike '%' || trim(p_search) || '%'
      or (regexp_replace(p_search, '\D', '', 'g') <> ''
          and l.key like '%' || right(regexp_replace(p_search, '\D', '', 'g'), 8) || '%')
   order by a.last_order_at desc
   limit greatest(1, least(coalesce(p_limit, 500), 2000));
$$;

revoke all on function public.admin_customers(text, integer) from public;
grant execute on function public.admin_customers(text, integer) to authenticated;

create or replace function public.admin_customer_orders(p_key text)
returns setof public.orders
language sql stable security invoker set search_path = public
as $$
  select *
    from public.orders
   where right(regexp_replace(phone1, '\D', '', 'g'), 8) = p_key
   order by created_at desc;
$$;

revoke all on function public.admin_customer_orders(text) from public;
grant execute on function public.admin_customer_orders(text) to authenticated;

-- Return / Refund v2: optional shipping refund (added on top of the items refund)

drop function if exists public.process_return(uuid, jsonb, boolean, numeric, text);

create or replace function public.process_return(
  p_order_id        uuid,
  p_items           jsonb,
  p_restock         boolean,
  p_refund_amount   numeric,
  p_reason          text default null,
  p_refund_shipping boolean default false
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
  v_ship      numeric(10,2) := 0;
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

  if coalesce(p_refund_shipping, false) then
    if v_order.shipping_refunded then
      raise exception 'Shipping was already refunded for this order';
    end if;
    v_ship := v_order.shipping_fee;
  end if;

  if v_refund < 0 or v_refund + v_ship > v_order.total_amount - v_order.refunded_amount then
    raise exception 'Refund cannot exceed % (what is left of the order total)', v_order.total_amount - v_order.refunded_amount;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Choose at least one item to return';
  end if;

  insert into public.order_returns (order_id, refund_amount, shipping_refund, restocked, reason)
  values (p_order_id, v_refund + v_ship, v_ship, coalesce(p_restock, true), nullif(trim(coalesce(p_reason, '')), ''))
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

  update public.orders
     set refunded_amount = refunded_amount + v_refund + v_ship,
         shipping_refunded = shipping_refunded or v_ship > 0,
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

revoke all on function public.process_return(uuid, jsonb, boolean, numeric, text, boolean) from public;
grant execute on function public.process_return(uuid, jsonb, boolean, numeric, text, boolean) to authenticated;

-- Multi-item exchanges: one batch, several returned lines (each with its own restock + reason)
-- and several new lines, plus an optional shipping refund.

create table if not exists public.order_exchange_batches (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  returned_value   numeric(10,2) not null default 0,
  new_value        numeric(10,2) not null default 0,
  shipping_refund  numeric(10,2) not null default 0,
  -- new_value - returned_value - shipping_refund: positive = collect, negative = refund
  price_difference numeric(10,2) not null default 0,
  note             text,
  created_by       uuid default auth.uid() references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists order_exchange_batches_order_idx on public.order_exchange_batches (order_id);

create table if not exists public.order_exchange_lines (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.order_exchange_batches(id) on delete cascade,
  direction     text not null check (direction in ('returned', 'new')),
  order_item_id uuid references public.order_items(id) on delete set null,
  product_name  text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null,
  restocked     boolean not null default false,
  reason        text
);
create index if not exists order_exchange_lines_batch_idx on public.order_exchange_lines (batch_id);

alter table public.order_exchange_batches enable row level security;
alter table public.order_exchange_lines   enable row level security;

drop policy if exists "order_exchange_batches_admin_all" on public.order_exchange_batches;
create policy "order_exchange_batches_admin_all" on public.order_exchange_batches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_exchange_lines_admin_all" on public.order_exchange_lines;
create policy "order_exchange_lines_admin_all" on public.order_exchange_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- p_returns:   [{"order_item_id": "uuid", "quantity": 1, "restock": true, "reason": "wrong size"}]
-- p_new_items: [{"product_id": "uuid", "quantity": 1}]
create or replace function public.process_exchange_multi(
  p_order_id        uuid,
  p_returns         jsonb,
  p_new_items       jsonb,
  p_refund_shipping boolean default false,
  p_note            text default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_order     record;
  v_line      record;
  v_batch     uuid;
  v_product   uuid;
  v_name      text;
  v_price     numeric(10,2);
  v_new_item  uuid;
  v_returned  numeric(10,2) := 0;
  v_new       numeric(10,2) := 0;
  v_ship      numeric(10,2) := 0;
  v_any_ret   boolean := false;
  v_any_new   boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
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

  insert into public.order_exchange_batches (order_id, note)
  values (p_order_id, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_batch;

  for v_line in
    select (e->>'order_item_id')::uuid as id,
           (e->>'quantity')::int as qty,
           coalesce((e->>'restock')::boolean, true) as restock,
           nullif(trim(coalesce(e->>'reason', '')), '') as reason
      from jsonb_array_elements(coalesce(p_returns, '[]'::jsonb)) e
  loop
    continue when coalesce(v_line.qty, 0) <= 0;

    update public.order_items
       set returned_quantity = returned_quantity + v_line.qty
     where id = v_line.id
       and order_id = p_order_id
       and returned_quantity + v_line.qty <= quantity
    returning product_id, product_name, unit_price into v_product, v_name, v_price;
    if not found then
      raise exception 'Exchange quantity is more than what is left on the order';
    end if;

    if v_line.restock then
      update public.products set stock_quantity = stock_quantity + v_line.qty where id = v_product;
    end if;

    insert into public.order_exchange_lines (batch_id, direction, order_item_id, product_name, quantity, unit_price, restocked, reason)
    values (v_batch, 'returned', v_line.id, v_name, v_line.qty, v_price, v_line.restock, v_line.reason);

    v_returned := v_returned + round(v_line.qty * v_price, 2);
    v_any_ret := true;
  end loop;

  for v_line in
    select (e->>'product_id')::uuid as id, sum((e->>'quantity')::int) as qty
      from jsonb_array_elements(coalesce(p_new_items, '[]'::jsonb)) e
     group by 1
  loop
    continue when coalesce(v_line.qty, 0) <= 0;

    update public.products
       set stock_quantity = stock_quantity - v_line.qty
     where id = v_line.id
       and stock_quantity >= v_line.qty
    returning price, name into v_price, v_name;
    if not found then
      raise exception 'Not enough stock for one of the replacement products';
    end if;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, from_exchange)
    values (p_order_id, v_line.id, v_name, v_line.qty, v_price, true)
    returning id into v_new_item;

    insert into public.order_exchange_lines (batch_id, direction, order_item_id, product_name, quantity, unit_price)
    values (v_batch, 'new', v_new_item, v_name, v_line.qty, v_price);

    v_new := v_new + round(v_line.qty * v_price, 2);
    v_any_new := true;
  end loop;

  if not v_any_ret then
    raise exception 'Choose at least one item the customer is returning';
  end if;
  if not v_any_new then
    raise exception 'Choose at least one replacement item';
  end if;

  if coalesce(p_refund_shipping, false) then
    if v_order.shipping_refunded then
      raise exception 'Shipping was already refunded for this order';
    end if;
    v_ship := v_order.shipping_fee;
  end if;

  -- What the customer keeps changes by (new - returned); a shipping refund is money paid back.
  update public.orders
     set subtotal = subtotal + v_new - v_returned,
         total_amount = total_amount + v_new - v_returned,
         refunded_amount = refunded_amount + v_ship,
         shipping_refunded = shipping_refunded or v_ship > 0
   where id = p_order_id;

  update public.order_exchange_batches
     set returned_value = v_returned,
         new_value = v_new,
         shipping_refund = v_ship,
         price_difference = v_new - v_returned - v_ship
   where id = v_batch;

  return json_build_object('batch_id', v_batch, 'price_difference', v_new - v_returned - v_ship);
exception
  when check_violation then
    raise exception 'This exchange would push the order total below its discount or refunds already given';
end
$$;

revoke all on function public.process_exchange_multi(uuid, jsonb, jsonb, boolean, text) from public;
grant execute on function public.process_exchange_multi(uuid, jsonb, jsonb, boolean, text) to authenticated;

-- The single-item exchange from 005 is replaced by process_exchange_multi.
-- Its order_exchanges history table is kept and still shown in the admin.
drop function if exists public.process_exchange(uuid, uuid, integer, boolean, uuid, integer, text);
