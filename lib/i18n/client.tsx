"use client";

import { createContext, useContext, useEffect } from "react";
import { dictionaries, dirOf, type Locale } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<Locale>("en");

// Gives client components the storefront locale, and mirrors it onto <html lang/dir> for
// screen readers and native controls. Leaving the storefront (e.g. to /admin) resets it.
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirOf(locale);
    return () => {
      html.lang = "en";
      html.dir = "ltr";
    };
  }, [locale]);

  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
