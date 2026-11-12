import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";

// Request-time read of the customer's language cookie (set by the header switcher).
// Callers must render inside <Suspense> (Cache Components); the storefront layout provides one.
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary() {
  return dictionaries[await getLocale()];
}
