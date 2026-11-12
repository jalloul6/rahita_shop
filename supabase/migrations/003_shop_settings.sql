-- Rahita migration 003: shop settings (storefront theme)
-- Run AFTER 002. Safe to re-run. Does NOT touch orders, products or payments.

-- Single-row settings table (id is always 1).
create table if not exists public.shop_settings (
  id         smallint primary key default 1 check (id = 1),
  theme      text not null default 'classic'
             check (theme in ('classic', 'warm', 'emerald', 'midnight')),
  updated_at timestamptz not null default now()
);

insert into public.shop_settings (id, theme)
values (1, 'classic')
on conflict (id) do nothing;

alter table public.shop_settings enable row level security;

-- Everyone may read the theme (the storefront needs it); only admins may change it.
drop policy if exists "shop_settings_public_read" on public.shop_settings;
create policy "shop_settings_public_read" on public.shop_settings
  for select using (true);

drop policy if exists "shop_settings_admin_write" on public.shop_settings;
create policy "shop_settings_admin_write" on public.shop_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists shop_settings_touch on public.shop_settings;
create trigger shop_settings_touch
  before update on public.shop_settings
  for each row execute function public.touch_updated_at();
