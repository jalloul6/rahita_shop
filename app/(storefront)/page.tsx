import { Suspense } from "react";
import Link from "next/link";
import { Banknote, Gift, Smartphone, Truck } from "lucide-react";
import { ProductGrid } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getLatestProducts, getSponsoredProducts, getStoreCategories } from "@/lib/data/storefront";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { SHOP_NAME } from "@/lib/shop";

const PERK_ICONS = [Banknote, Smartphone, Truck, Gift];

export default async function HomePage() {
  const t = await getDictionary();

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-3xl bg-hero px-6 py-16 text-hero-foreground sm:px-12 sm:py-24">
        {/* soft decorative glow in the theme's accent color */}
        <div aria-hidden="true" className="absolute -end-24 -top-24 -z-10 size-72 rounded-full bg-highlight/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -start-16 -bottom-32 -z-10 size-80 rounded-full bg-highlight/20 blur-3xl" />

        <p className="text-xs font-semibold tracking-[0.25em] uppercase opacity-80 sm:text-sm">{t.tagline}</p>
        <h1 className="mt-4 max-w-2xl font-heading text-4xl leading-[1.15] font-semibold tracking-tight sm:text-6xl">
          {t.home.heroTitle}
        </h1>
        <p className="mt-5 max-w-lg text-base opacity-85 sm:text-lg">{t.home.heroText(SHOP_NAME)}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-full bg-hero-foreground px-7 text-sm font-semibold text-hero shadow-lg transition-transform hover:-translate-y-0.5"
          >
            {t.home.shopNow}
          </Link>
          <Link
            href="#featured"
            className="inline-flex h-11 items-center rounded-full border border-hero-foreground/40 px-7 text-sm font-semibold transition-colors hover:bg-hero-foreground/10"
          >
            {t.home.featuredPicks}
          </Link>
        </div>
      </section>

      <section aria-label={t.home.perksAria} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {t.home.perks.map(({ title, text }, i) => {
          const Icon = PERK_ICONS[i];
          return (
            <div key={title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </div>
          );
        })}
      </section>

      <Suspense fallback={<p className="text-muted-foreground">{t.home.loadingProducts}</p>}>
        <CatalogSections t={t} />
      </Suspense>
    </div>
  );
}

async function CatalogSections({ t }: { t: Dictionary }) {
  const [sponsored, latest, categories] = await Promise.all([
    getSponsoredProducts(),
    getLatestProducts(8),
    getStoreCategories(),
  ]);

  return (
    <>
      {categories.length > 0 && (
        <section aria-label={t.home.byCategory} className="space-y-5">
          <SectionHeading eyebrow={t.home.browse} title={t.home.byCategory} />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c}
                href={`/products?category=${encodeURIComponent(c)}`}
                className="rounded-full border bg-card px-5 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      )}

      {sponsored.length > 0 && (
        <section id="featured" className="scroll-mt-24 space-y-6">
          <SectionHeading eyebrow={t.home.handPicked} title={t.home.featured} href="/products" linkLabel={t.home.viewAll} />
          <ProductGrid products={sponsored} t={t} />
        </section>
      )}

      <section className="space-y-6">
        <SectionHeading eyebrow={t.home.justIn} title={t.home.newArrivals} href="/products" linkLabel={t.home.viewAll} />
        {latest.length > 0 ? (
          <ProductGrid products={latest} t={t} />
        ) : (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t.home.catalogEmpty}</p>
        )}
      </section>
    </>
  );
}
