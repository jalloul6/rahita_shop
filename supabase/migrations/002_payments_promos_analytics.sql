-- Rahita migration 002: Whish Money payments, promo codes, dashboard stats
-- Run AFTER supabase/schema.sql. Safe to re-run. Does NOT drop or delete any data.

-- Enums

do $$ begin
  create type public.payment_method as enum ('cod', 'whish');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percentage', 'fixed');
exception when duplicate_object then null; end $$;

-- Orders: payment + discount columns

alter table public.orders
  add column if not exists payment_method  public.payment_method not null default 'cod',
  add column if not exists payment_status  public.payment_status not null default 'pending',
  add column if not exists promo_code      text,
  add column if not exists discount_amount numeric(10,2) not null default 0;

alter table public.orders drop constraint if exists orders_discount_ok;
alter table public.orders add constraint orders_discount_ok
  check (discount_amount >= 0 and discount_amount <= subtotal);

alter table public.orders drop constraint if exists orders_total_ok;
alter table public.orders add constraint orders_total_ok
  check (total_amount = subtotal - discount_amount + shipping_fee);

create index if not exists orders_payment_idx on public.orders (payment_method, payment_status);

-- Promo codes (codes are stored uppercase; customers can type any case)

create table if not exists public.promo_codes (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type  public.discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint promo_percentage_ok check (discount_type <> 'percentage' or discount_value <= 100)
);

alter table public.promo_codes enable row level security;

-- Admin only. Customers never read the table; they check one code via validate_promo_code().
drop policy if exists "promo_codes_admin_all" on public.promo_codes;
create policy "promo_codes_admin_all" on public.promo_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Checkout "Apply" button: returns the code's discount if it exists and is active, else no rows.
create or replace function public.validate_promo_code(p_code text)
returns table (code text, discount_type public.discount_type, discount_value numeric)
language sql stable security definer set search_path = public
as $$
  select p.code, p.discount_type, p.discount_value
    from public.promo_codes p
   where p.code = upper(trim(coalesce(p_code, '')))
     and p.is_active
$$;

revoke all on function public.validate_promo_code(text) from public;
grant execute on function public.validate_promo_code(text) to anon, authenticated;

-- Status trigger: same rules as before, plus COD orders become paid when delivered

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
       set stock_quantity = p.stock_quantity + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id
       and oi.product_id = p.id;
  end if;

  return new;
end
$$;

-- Checkout RPC v2: payment method + promo code. Replaces the old 7-argument version.

drop function if exists public.place_order(text, text, text, text, uuid, jsonb, text);

create or replace function public.place_order(
  p_customer_name    text,
  p_phone1           text,
  p_phone2           text,
  p_address          text,
  p_shipping_zone_id uuid,
  p_items            jsonb,
  p_notes            text default null,
  p_payment_method   text default 'cod',
  p_promo_code       text default null
)
returns table (order_id uuid, order_number bigint, total_amount numeric, discount_amount numeric)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_fee      numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_code     text;
  v_method   public.payment_method;
  v_order_id uuid;
  v_number   bigint;
  v_item     record;
  v_promo    record;
  v_price    numeric(10,2);
  v_name     text;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Name is required';
  end if;
  if length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Address is required';
  end if;

  p_phone1 := trim(coalesce(p_phone1, ''));
  p_phone2 := nullif(trim(coalesce(p_phone2, '')), '');

  if p_phone1 !~ '^[0-9+ ()-]{7,20}$' then
    raise exception 'Invalid phone number';
  end if;
  if p_phone2 is not null and p_phone2 !~ '^[0-9+ ()-]{7,20}$' then
    raise exception 'Invalid second phone number';
  end if;

  if coalesce(p_payment_method, '') not in ('cod', 'whish') then
    raise exception 'Invalid payment method';
  end if;
  v_method := p_payment_method::public.payment_method;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  select z.delivery_fee into v_fee
    from public.shipping_zones z
   where z.id = p_shipping_zone_id and z.is_active;
  if not found then
    raise exception 'Invalid shipping zone';
  end if;

  insert into public.orders (customer_name, phone1, phone2, address, shipping_zone_id,
                             subtotal, shipping_fee, total_amount, notes, payment_method)
  values (trim(p_customer_name), p_phone1, p_phone2, trim(p_address), p_shipping_zone_id,
          0, v_fee, v_fee, nullif(trim(coalesce(p_notes, '')), ''), v_method)
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

    update public.products
       set stock_quantity = stock_quantity - v_item.qty
     where id = v_item.product_id
       and is_active
       and stock_quantity >= v_item.qty
    returning price, name into v_price, v_name;

    if not found then
      raise exception 'Product unavailable or insufficient stock (%)', v_item.product_id;
    end if;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order_id, v_item.product_id, v_name, v_item.qty, v_price);

    v_subtotal := v_subtotal + v_price * v_item.qty;
  end loop;

  -- Discount applies to the products subtotal only, never to the delivery fee.
  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select pc.code, pc.discount_type, pc.discount_value into v_promo
      from public.promo_codes pc
     where pc.code = upper(trim(p_promo_code)) and pc.is_active;
    if not found then
      raise exception 'Invalid promo code';
    end if;

    if v_promo.discount_type = 'percentage' then
      v_discount := round(v_subtotal * v_promo.discount_value / 100, 2);
    else
      v_discount := least(v_promo.discount_value, v_subtotal);
    end if;
    v_code := v_promo.code;
  end if;

  update public.orders
     set subtotal = v_subtotal,
         discount_amount = v_discount,
         promo_code = v_code,
         total_amount = v_subtotal - v_discount + v_fee
   where id = v_order_id;

  return query select v_order_id, v_number, (v_subtotal - v_discount + v_fee)::numeric, v_discount::numeric;
end
$$;

revoke all on function public.place_order(text, text, text, text, uuid, jsonb, text, text, text) from public;
grant execute on function public.place_order(text, text, text, text, uuid, jsonb, text, text, text) to anon, authenticated;

-- Admin dashboard KPIs, computed in the database (no row limits)
-- total_sales: delivered or paid orders. today/month: value of orders placed, excluding canceled/returned.

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

  select json_build_object(
    'total_sales', coalesce(sum(o.total_amount) filter (
        where o.status not in ('canceled', 'returned')
          and (o.status = 'delivered' or o.payment_status = 'paid')), 0),
    'today_sales', coalesce(sum(o.total_amount) filter (
        where o.status not in ('canceled', 'returned')
          and (o.created_at at time zone p_tz)::date = v_today), 0),
    'today_orders', count(*) filter (where (o.created_at at time zone p_tz)::date = v_today),
    'month_sales', coalesce(sum(o.total_amount) filter (
        where o.status not in ('canceled', 'returned')
          and (o.created_at at time zone p_tz)::date >= v_month), 0),
    'month_orders', count(*) filter (
        where o.status not in ('canceled', 'returned')
          and (o.created_at at time zone p_tz)::date >= v_month),
    'pending', count(*) filter (where o.status = 'pending'),
    'processing', count(*) filter (where o.status = 'processing'),
    'out_for_delivery', count(*) filter (where o.status = 'out_for_delivery'),
    'unpaid_whish', count(*) filter (
        where o.payment_method = 'whish' and o.payment_status = 'pending'
          and o.status not in ('canceled', 'returned'))
  ) into v_kpis
  from public.orders o;

  select coalesce(json_agg(t), '[]'::json) into v_top
  from (
    select oi.product_id,
           max(oi.product_name) as name,
           sum(oi.quantity)::int as quantity,
           sum(oi.quantity * oi.unit_price) as revenue
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where o.status not in ('canceled', 'returned')
     group by oi.product_id
     order by sum(oi.quantity) desc, sum(oi.quantity * oi.unit_price) desc
     limit 3
  ) t;

  return json_build_object('kpis', v_kpis, 'top_products', v_top);
end
$$;

revoke all on function public.admin_dashboard_stats(text) from public;
grant execute on function public.admin_dashboard_stats(text) to authenticated;
