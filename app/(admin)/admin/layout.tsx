import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminDarkToggle, AdminThemeSelect } from "@/components/admin/admin-theme-switcher";
import { Button } from "@/components/ui/button";
import { AdminI18nProvider } from "@/lib/i18n/admin-client";
import { adminDictionaries } from "@/lib/i18n/admin";
import { getAdminLocale, getAdminTheme } from "@/lib/i18n/admin-server";
import { getShopSettings } from "@/lib/data/storefront";
import { brandFor } from "@/lib/settings";
import { signOut } from "./actions";

// Tab title "<page> | <store name> Admin", using the store name from /admin/settings.
export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([getShopSettings(), getAdminLocale()]);
  const brand = adminDictionaries[locale].brand(brandFor(settings, locale).name);
  return { title: { default: brand, template: `%s | ${brand}` }, robots: { index: false, follow: false } };
}

// Access is enforced in proxy.ts (session + is_admin) and again in each action/route handler.
// The dashboard language and theme come from the admin_lang / admin_theme cookies (request-time
// data), so the shell renders inside Suspense and sets lang/dir/data-admin-theme for all of /admin.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const [locale, theme, settings] = await Promise.all([getAdminLocale(), getAdminTheme(), getShopSettings()]);
  const t = adminDictionaries[locale];
  const shopName = brandFor(settings, locale).name;

  return (
    <AdminI18nProvider locale={locale}>
      <div
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
        data-locale={locale}
        data-admin-theme={theme}
        className="flex min-h-screen flex-col bg-background text-foreground md:flex-row print:block print:bg-white"
      >
        <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-e md:border-b-0 print:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 md:block md:space-y-3 md:py-5">
            {settings.logoUrl ? (
              <div className="flex min-w-0 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logoUrl} alt={shopName} className="h-9 w-auto max-w-[8rem] object-contain" />
                <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.nav.adminLabel}</span>
              </div>
            ) : (
              <span className="text-lg font-semibold tracking-tight md:block">{t.brand(shopName)}</span>
            )}
            <div className="flex items-center gap-1 md:hidden">
              <AdminLanguageSwitcher />
              <AdminDarkToggle theme={theme} />
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="size-4 rtl:rotate-180" />
                  {t.nav.logout}
                </Button>
              </form>
            </div>
            <div className="hidden space-y-2 md:block">
              <div className="flex items-center gap-2">
                <AdminLanguageSwitcher />
                <AdminDarkToggle theme={theme} />
              </div>
              <AdminThemeSelect theme={theme} className="w-full" />
            </div>
          </div>
          <div className="overflow-x-auto px-2 pb-2 md:px-3">
            <AdminNav />
          </div>
          <form action={signOut} className="hidden px-3 pt-4 md:block">
            <Button type="submit" variant="outline" className="w-full justify-start">
              <LogOut className="size-4 rtl:rotate-180" />
              {t.nav.logout}
            </Button>
          </form>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </div>
    </AdminI18nProvider>
  );
}
