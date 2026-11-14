import "server-only";
import { cookies } from "next/headers";
import { ADMIN_THEME_COOKIE, DEFAULT_ADMIN_THEME, isAdminTheme, type AdminTheme } from "@/lib/admin-theme";
import { ADMIN_LOCALE_COOKIE, adminDictionaries, isAdminLocale, type AdminLocale } from "@/lib/i18n/admin";

// Request-time read of the dashboard language (set by the sidebar switcher). Separate from the
// storefront "lang" cookie. Callers render inside <Suspense> (Cache Components).
export async function getAdminLocale(): Promise<AdminLocale> {
  const value = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return isAdminLocale(value) ? value : "en";
}

export async function getAdminT() {
  return adminDictionaries[await getAdminLocale()];
}

export async function getAdminTheme(): Promise<AdminTheme> {
  const value = (await cookies()).get(ADMIN_THEME_COOKIE)?.value;
  return isAdminTheme(value) ? value : DEFAULT_ADMIN_THEME;
}
