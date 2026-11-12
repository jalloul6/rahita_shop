// Storefront themes. Colors live in app/globals.css under [data-theme="..."];
// this file only names them. Keep ids in sync with the shop_settings.theme check constraint.

export const THEMES = [
  {
    id: "classic",
    name: "Classic Light",
    description: "Pure white with crisp black and grey accents. Minimal, Apple / Zara style.",
  },
  {
    id: "warm",
    name: "Warm Luxury",
    description: "Warm cream background with soft gold and brown. Great for gifts and home decor.",
  },
  {
    id: "emerald",
    name: "Modern Emerald",
    description: "Clean white with elegant emerald green. Fresh, trustworthy and lively.",
  },
  {
    id: "midnight",
    name: "Midnight Dark",
    description: "Rich charcoal with clear text and gold highlights. Premium night look.",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "classic";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

// Visitor light/dark preference (header sun/moon toggle). Stored per visitor in a cookie,
// which the server reads so the right theme is in the first HTML (no flash), and mirrored
// in localStorage. It never changes the shop-wide theme saved in /admin/appearance.
export const MODE_COOKIE = "mode";
export type ColorMode = "light" | "dark";
export const DARK_THEME: ThemeId = "midnight";
const FALLBACK_LIGHT_THEME: ThemeId = "classic";

export function isColorMode(value: unknown): value is ColorMode {
  return value === "light" || value === "dark";
}

// The light theme a visitor gets: the shop's theme, or Classic if the shop's theme is itself dark.
export function lightThemeFor(shopTheme: ThemeId): ThemeId {
  return shopTheme === DARK_THEME ? FALLBACK_LIGHT_THEME : shopTheme;
}

// No preference -> the shop's theme as configured by the admin.
export function resolveTheme(shopTheme: ThemeId, mode: ColorMode | null): ThemeId {
  if (mode === "dark") return DARK_THEME;
  if (mode === "light") return lightThemeFor(shopTheme);
  return shopTheme;
}
