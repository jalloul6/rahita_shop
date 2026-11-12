import { Suspense } from "react";
import Link from "next/link";
import { Banknote, Gift, Smartphone, Truck } from "lucide-react";
import { ProductGrid } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { getLatestProducts, getSponsoredProducts, getStoreCategories } from "@/lib/data/storefront";
import { SHOP_NAME, SHOP_TAGLINE } from "@/lib/shop";

const PERKS = [
  { icon: Banknote, title: "Cash on Delivery", text: "Pay when your order arrives" },
  { icon: Smartphone, title: "Whish Money", text: "Fast, secure transfer" },
  { icon: Truck, title: "Lebanon-wide delivery", text: "To your door, all regions" },
  { icon: Gift, title: "Gift-ready", text: "Carefully packed with love" },
];

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-3xl bg-hero px-6 py-16 text-hero-foreground sm:px-12 sm:py-24">
        {/* soft decorative glow in the theme's accent color */}
        <div aria-hidden="true" className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-highlight/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 -z-10 size-80 rounded-full bg-highlight/20 blur-3xl" />

        <p className="text-xs font-semibold tracking-[0.25em] uppercase opacity-80 sm:text-sm">{SHOP_TAGLINE}</p>
        <h1 className="mt-4 max-w-2xl font-heading text-4xl leading-[1.1] font-semibold tracking-tight sm:text-6xl">
          Find a scent, or a gift, they&apos;ll remember.
        </h1>
        <p className="mt-5 max-w-lg text-base opacity-85 sm:text-lg">
          Browse {SHOP_NAME}&apos;s collection and pay cash on delivery or by Whish Money.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-full bg-hero-foreground px-7 text-sm font-semibold text-hero shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Shop now
          </Link>
          <Link
            href="#featured"
            className="inline-flex h-11 items-center rounded-full border border-hero-foreground/40 px-7 text-sm font-semibold transition-colors hover:bg-hero-foreground/10"
          >
            Featured picks
          </Link>
        </div>
      </section>

      <section aria-label="Why shop with us" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{text}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Catalog data is cached; Suspense keeps the hero in the static shell either way */}
      <Suspense fallback={<p className="text-muted-foreground">Loading products…</p>}>
        <CatalogSections />
      </Suspense>
    </div>
  );
}

async function CatalogSections() {
  const [sponsored, latest, categories] = await Promise.all([
    getSponsoredProducts(),
    getLatestProducts(8),
    getStoreCategories(),
  ]);

  return (
    <>
      {categories.length > 0 && (
        <section aria-label="Categories" className="space-y-5">
          <SectionHeading eyebrow="Browse" title="Shop by category" />
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
          <SectionHeading eyebrow="Hand-picked" title="Featured" href="/products" />
          <ProductGrid products={sponsored} />
        </section>
      )}

      <section className="space-y-6">
        <SectionHeading eyebrow="Just in" title="New arrivals" href="/products" />
        {latest.length > 0 ? (
          <ProductGrid products={latest} />
        ) : (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            Our catalog is being updated. Please check back soon.
          </p>
        )}
      </section>
    </>
  );
}
