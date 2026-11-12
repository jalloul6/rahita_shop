import { Suspense } from "react";
import Link from "next/link";
import { Banknote, Smartphone, Truck } from "lucide-react";
import { CartLink } from "@/components/storefront/cart-link";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { getShopTheme } from "@/lib/data/storefront";
import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries, dirOf } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { SHOP_NAME, SHOP_PHONE } from "@/lib/shop";

// The language comes from a cookie (request-time data), so the whole storefront renders inside
// this Suspense boundary. Catalog data stays cached through "use cache" in lib/data/storefront.
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <StoreShell>{children}</StoreShell>
    </Suspense>
  );
}

// Theme (from /admin/appearance) is applied via data-theme; language via lang/dir/data-locale.
// Both only affect the storefront: /admin keeps its own neutral, English, LTR layout.
async function StoreShell({ children }: { children: React.ReactNode }) {
  const [theme, locale] = await Promise.all([getShopTheme(), getLocale()]);
  const t = dictionaries[locale];

  return (
    <I18nProvider locale={locale}>
      <div
        data-theme={theme}
        data-locale={locale}
        lang={locale}
        dir={dirOf(locale)}
        className="flex min-h-screen flex-col bg-background font-sans text-foreground"
      >
        <div className="bg-hero text-hero-foreground">
          <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium tracking-wide sm:text-sm">
            {t.header.announcement}
          </p>
        </div>

        <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" className="group flex min-w-0 flex-col leading-none">
              <span className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{SHOP_NAME}</span>
              <span className="hidden text-[0.7rem] tracking-[0.2em] text-muted-foreground uppercase sm:block">
                {t.tagline}
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm font-medium sm:gap-1">
              <Link
                href="/"
                className="hidden rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground sm:block"
              >
                {t.header.home}
              </Link>
              <Link
                href="/products"
                className="rounded-md px-2.5 py-2 transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3"
              >
                {t.header.shop}
              </Link>
              <CartLink />
              <LanguageSwitcher />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">{children}</main>

        <footer className="mt-12 border-t bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="font-heading text-lg font-semibold">{SHOP_NAME}</div>
              <p className="text-sm text-muted-foreground">{t.footer.blurb}</p>
              {SHOP_PHONE && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {SHOP_PHONE}
                </p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="font-semibold">{t.footer.shop}</div>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <Link href="/products" className="hover:text-foreground">
                    {t.footer.allProducts}
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-foreground">
                    {t.footer.yourCart}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2 text-sm">
              <div className="font-semibold">{t.footer.weAccept}</div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Banknote className="size-4" /> {t.footer.cod}
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="size-4" /> {t.footer.whish}
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="size-4" /> {t.footer.delivery}
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t py-4 text-center text-xs text-muted-foreground">
            © {SHOP_NAME}. {t.footer.rights}
          </div>
        </footer>
      </div>
    </I18nProvider>
  );
}
