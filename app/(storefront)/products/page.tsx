import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/product-card";
import { getCatalog, getStoreCategories } from "@/lib/data/storefront";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

export default async function CatalogPage(props: PageProps<"/products">) {
  const t = await getDictionary();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{t.catalog.title}</h1>
      <Suspense fallback={<p className="text-muted-foreground">{t.home.loadingProducts}</p>}>
        <Catalog searchParams={props.searchParams} t={t} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams, t }: { searchParams: PageProps<"/products">["searchParams"]; t: Dictionary }) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;

  const categories = await getStoreCategories();
  // Only accept categories that exist; anything else shows the full catalog
  const category = raw && categories.includes(raw) ? raw : null;
  const products = await getCatalog(category);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href="/products" className={cn(buttonVariants({ variant: category ? "outline" : "default", size: "sm" }), "rounded-full px-4")}>
          {t.catalog.all}
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/products?category=${encodeURIComponent(c)}`}
            className={cn(buttonVariants({ variant: category === c ? "default" : "outline", size: "sm" }), "rounded-full px-4")}
          >
            {c}
          </Link>
        ))}
      </div>
      {products.length > 0 ? (
        <ProductGrid products={products} t={t} />
      ) : (
        <p className="py-12 text-center text-muted-foreground">{t.catalog.noProducts}</p>
      )}
    </>
  );
}
