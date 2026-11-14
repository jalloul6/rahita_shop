import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { AdminI18nProvider } from "@/lib/i18n/admin-client";
import { adminDictionaries } from "@/lib/i18n/admin";
import { getAdminLocale } from "@/lib/i18n/admin-server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Rahita Admin" },
  robots: { index: false, follow: false },
};

// Access is enforced in proxy.ts (session + is_admin) and again in each action/route handler.
// The dashboard language comes from the admin_lang cookie (request-time data), so the shell
// renders inside Suspense and sets lang/dir for the whole admin area.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  const t = adminDictionaries[locale];

  return (
    <AdminI18nProvider locale={locale}>
      <div
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
        data-locale={locale}
        className="flex min-h-screen flex-col md:flex-row print:block"
      >
        <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-e md:border-b-0 print:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 md:block md:space-y-3 md:py-5">
            <span className="text-lg font-semibold tracking-tight md:block">{t.brand}</span>
            <div className="flex items-center gap-1 md:hidden">
              <AdminLanguageSwitcher />
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="size-4 rtl:rotate-180" />
                  {t.nav.logout}
                </Button>
              </form>
            </div>
            <AdminLanguageSwitcher className="hidden md:inline-flex" />
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
