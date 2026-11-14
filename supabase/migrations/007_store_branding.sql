-- 007: Store name + tagline (EN/AR), editable from /admin/settings.
-- Empty values fall back to the built-in defaults in the app ("Rahita" / "رحيتا",
-- "Perfumes & Gifts" / "عطور وهدايا"), so this is safe to run on a live store.
-- Run after 006_cms_customers_multi_exchange.sql. Safe to re-run.

alter table public.shop_settings
  add column if not exists store_name_en text,
  add column if not exists store_name_ar text,
  add column if not exists tagline_en text,
  add column if not exists tagline_ar text;

-- Keep values short enough for the header, tab title and receipt.
alter table public.shop_settings drop constraint if exists shop_settings_branding_length;
alter table public.shop_settings
  add constraint shop_settings_branding_length check (
    coalesce(length(store_name_en), 0) <= 60
    and coalesce(length(store_name_ar), 0) <= 60
    and coalesce(length(tagline_en), 0) <= 80
    and coalesce(length(tagline_ar), 0) <= 80
  );
