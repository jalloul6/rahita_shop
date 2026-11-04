import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/product-card";
import { getLatestProducts, getSponsoredProducts, getStoreCategories } from "@/lib/data/storefront";
import { SHOP_NAME, SHOP_TAGLINE } from "@/lib/shop";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 px-6 py-16 text-primary-foreground sm:px-12 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-widest opacity-80">{SHOP_TAGLINE}</p>
        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
          Find a scent, or a gift, they&apos;ll remember.
        </h1>
        <p className="mt-4 max-w-lg opacity-90">
          Browse {SHOP_NAME}&apos;s collection and pay cash when your order arrives at your door.
        </p>
        <Link href="/products" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "mt-8")}>
          Shop now
        </Link>
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
        <section aria-label="Categories" className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/products?category=${encodeURIComponent(c)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {c}
            </Link>
          ))}
        </section>
      )}

      {sponsored.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
          <ProductGrid products={sponsored} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">New arrivals</h2>
          <Link href="/products" className="text-sm underline-offset-4 hover:underline">
            View all
          </Link>
        </div>
        {latest.length > 0 ? (
          <ProductGrid products={latest} />
        ) : (
          <p className="text-muted-foreground">Our catalog is being updated. Please check back soon.</p>
        )}
      </section>
    </>
  );
}
