-- Rahita: perfumes and gifts shop (Cash on Delivery)
-- Idempotent: safe to re-run. WARNING: re-running DROPS all data in these tables.

-- Cleanup

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_admin_write" on storage.objects;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.shipping_zones cascade;
drop table if exists public.products cascade;
drop table if exists public.admin_users cascade;

drop function if exists public.place_order(text, text, text, text, uuid, jsonb, text) cascade;
drop function if exists public.handle_order_status_change() cascade;
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.is_admin() cascade;

drop type if exists public.order_status cascade;
drop type if exists order_status cascade;

-- Enum

create type public.order_status as enum (
  'pending', 'processing', 'out_for_delivery', 'delivered', 'returned', 'canceled'
);

-- Tables

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) > 0),
  description    text,
  price          numeric(10,2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image_url      text,
  category       text not null default 'uncategorized',
  is_sponsored   boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index products_category_idx on public.products (category);
create index products_sponsored_idx on public.products (is_sponsored) where is_sponsored;

create table public.shipping_zones (
  id           uuid primary key default gen_random_uuid(),
  zone_name    text not null unique,
  delivery_fee numeric(10,2) not null check (delivery_fee >= 0),
  is_active    boolean not null default true
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     bigint generated always as identity,
  customer_name    text not null,
  phone1           text not null,
  phone2           text,
  address          text not null,
  shipping_zone_id uuid not null references public.shipping_zones(id),
  status           public.order_status not null default 'pending',
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  shipping_fee     numeric(10,2) not null check (shipping_fee >= 0),
  total_amount     numeric(10,2) not null check (total_amount >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_total_ok check (total_amount = subtotal + shipping_fee)
);
create index orders_status_idx on public.orders (status);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- Admin allow-list. After creating your auth user, run:
-- insert into public.admin_users (user_id) values ('PASTE-AUTH-USER-UUID');
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Helper functions

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Stock restore on cancel or return, and lock of final states

create function public.handle_order_status_change()
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

create trigger orders_status_change
  before update of status on public.orders
  for each row execute function public.handle_order_status_change();

-- Public checkout RPC
-- p_items example: [{"product_id": "uuid", "quantity": 2}]

create function public.place_order(
  p_customer_name    text,
  p_phone1           text,
  p_phone2           text,
  p_address          text,
  p_shipping_zone_id uuid,
  p_items            jsonb,
  p_notes            text default null
)
returns table (order_id uuid, order_number bigint, total_amount numeric)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_fee      numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_order_id uuid;
  v_number   bigint;
  v_item     record;
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
                             subtotal, shipping_fee, total_amount, notes)
  values (trim(p_customer_name), p_phone1, p_phone2, trim(p_address), p_shipping_zone_id,
          0, v_fee, v_fee, nullif(trim(coalesce(p_notes, '')), ''))
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

  update public.orders
     set subtotal = v_subtotal,
         total_amount = v_subtotal + v_fee
   where id = v_order_id;

  return query select v_order_id, v_number, (v_subtotal + v_fee)::numeric;
end
$$;

revoke all on function public.place_order(text, text, text, text, uuid, jsonb, text) from public;
grant execute on function public.place_order(text, text, text, text, uuid, jsonb, text) to anon, authenticated;

-- Row Level Security

alter table public.products       enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.admin_users    enable row level security;

create policy "products_public_read" on public.products
  for select using (is_active or public.is_admin());
create policy "products_admin_write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "zones_public_read" on public.shipping_zones
  for select using (is_active or public.is_admin());
create policy "zones_admin_write" on public.shipping_zones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "orders_admin_all" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order_items_admin_all" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage: product images

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product_images_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- Seed data: edit zones and fees to match your regions

insert into public.shipping_zones (zone_name, delivery_fee) values
  ('Zone A - City Center', 3.00),
  ('Zone B - Suburbs', 5.00),
  ('Zone C - Outskirts', 8.00);
