"use client";

import { createContext, useContext, useEffect } from "react";
import { adminDictionaries, type AdminLocale } from "@/lib/i18n/admin";

const AdminLocaleContext = createContext<AdminLocale>("en");

// Gives admin client components the dashboard language and mirrors it onto <html lang/dir>
// so native controls (inputs, selects, confirm dialogs) follow the same direction.
export function AdminI18nProvider({ locale, children }: { locale: AdminLocale; children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === "ar" ? "rtl" : "ltr";
    return () => {
      html.lang = "en";
      html.dir = "ltr";
    };
  }, [locale]);

  return <AdminLocaleContext value={locale}>{children}</AdminLocaleContext>;
}

export function useAdminT() {
  const locale = useContext(AdminLocaleContext);
  return { locale, t: adminDictionaries[locale] };
}
