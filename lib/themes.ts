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
