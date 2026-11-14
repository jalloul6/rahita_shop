-- 008: Store logo, uploaded from /admin/settings into the product-images bucket (logo/ folder).
-- When empty, the store shows its text name as before. Safe to re-run.
-- Run after 007_store_branding.sql.

alter table public.shop_settings
  add column if not exists logo_url text;

-- Only https URLs (the app further restricts it to this project's own storage bucket).
alter table public.shop_settings drop constraint if exists shop_settings_logo_url_https;
alter table public.shop_settings
  add constraint shop_settings_logo_url_https check (logo_url is null or (logo_url like 'https://%' and length(logo_url) <= 500));
