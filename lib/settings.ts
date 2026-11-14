// Shop settings as the storefront uses them: database values from /admin/settings with the
// built-in defaults filled in. Safe for server and client (no server-only imports).

import type { Locale } from "@/lib/i18n/dictionaries";
import { SHOP_NAME, SHOP_NAME_AR, SHOP_TAGLINE, SHOP_TAGLINE_AR, WHATSAPP_NUMBER, WHISH_NUMBER } from "@/lib/shop";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";
import type { ShopSettings } from "@/types/database";

type Pair = { en: string | null; ar: string | null };

export type StoreSettings = {
  theme: ThemeId;
  storeName: Pair;
  tagline: Pair;
  whatsappNumber: string; // digits only, international format
  whishNumber: string;
  instagramUrl: string | null;
  copyright: Pair;
  announcement: { enabled: boolean } & Pair;
  hero: { imageUrl: string | null; title: Pair; text: Pair; cta: Pair; ctaUrl: string };
};

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export function resolveSettings(row: Partial<ShopSettings> | null): StoreSettings {
  return {
    theme: isThemeId(row?.theme) ? row.theme : DEFAULT_THEME,
    storeName: { en: clean(row?.store_name_en), ar: clean(row?.store_name_ar) },
    tagline: { en: clean(row?.tagline_en), ar: clean(row?.tagline_ar) },
    whatsappNumber: toWhatsAppDigits(clean(row?.whatsapp_number) ?? WHATSAPP_NUMBER),
    whishNumber: clean(row?.whish_number) ?? WHISH_NUMBER,
    instagramUrl: clean(row?.instagram_url),
    copyright: { en: clean(row?.copyright_en), ar: clean(row?.copyright_ar) },
    announcement: {
      enabled: row?.announcement_enabled ?? true,
      en: clean(row?.announcement_en),
      ar: clean(row?.announcement_ar),
    },
    hero: {
      imageUrl: clean(row?.hero_image_url),
      title: { en: clean(row?.hero_title_en), ar: clean(row?.hero_title_ar) },
      text: { en: clean(row?.hero_text_en), ar: clean(row?.hero_text_ar) },
      cta: { en: clean(row?.hero_cta_en), ar: clean(row?.hero_cta_ar) },
      ctaUrl: clean(row?.hero_cta_url) ?? "/products",
    },
  };
}

// Text for the current language, falling back to the other language's custom text, then the default.
export function pick(pair: Pair, locale: Locale, fallback: string) {
  return (locale === "ar" ? pair.ar ?? pair.en : pair.en ?? pair.ar) ?? fallback;
}

// Store name + tagline for a language. Each language falls back to its own built-in default
// (not to the other language), so an English-only brand still reads naturally in Arabic.
export function brandFor(settings: Pick<StoreSettings, "storeName" | "tagline">, locale: Locale) {
  const ar = locale === "ar";
  return {
    name: (ar ? settings.storeName.ar : settings.storeName.en) ?? (ar ? SHOP_NAME_AR : SHOP_NAME),
    tagline: (ar ? settings.tagline.ar : settings.tagline.en) ?? (ar ? SHOP_TAGLINE_AR : SHOP_TAGLINE),
  };
}

// "70 123 456", "+961 70123456", "070123456" -> "96170123456" (Lebanon by default).
export function toWhatsAppDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("961")) return digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length <= 8 ? `961${digits}` : digits;
}

export function waLink(number: string, message?: string) {
  return `https://wa.me/${toWhatsAppDigits(number)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
