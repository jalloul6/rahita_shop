// Admin dashboard themes (independent of the storefront theme). Colors live in app/globals.css
// under [data-admin-theme="..."]; the choice is kept in the admin_theme cookie.
export const ADMIN_THEMES = ["clean", "shopify", "gold"] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];
export const ADMIN_THEME_COOKIE = "admin_theme";
export const DEFAULT_ADMIN_THEME: AdminTheme = "clean";
export const DEFAULT_DARK_ADMIN_THEME: AdminTheme = "shopify";

export function isAdminTheme(value: unknown): value is AdminTheme {
  return ADMIN_THEMES.includes(value as AdminTheme);
}

export function isDarkAdminTheme(theme: AdminTheme) {
  return theme !== "clean";
}
