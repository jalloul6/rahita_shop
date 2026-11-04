import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/product-card";
import { getCatalog, getStoreCategories } from "@/lib/data/storefront";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

export default function CatalogPage(props: PageProps<"/products">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading products…</p>}>
        <Catalog searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;

  const categories = await getStoreCategories();
  // Only accept categories that exist; anything else shows the full catalog
  const category = raw && categories.includes(raw) ? raw : null;
  const products = await getCatalog(category);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link href="/products" className={cn(buttonVariants({ variant: category ? "outline" : "default", size: "sm" }))}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/products?category=${encodeURIComponent(c)}`}
            className={cn(buttonVariants({ variant: category === c ? "default" : "outline", size: "sm" }))}
          >
            {c}
          </Link>
        ))}
      </div>
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p className="py-12 text-center text-muted-foreground">No products found.</p>
      )}
    </>
  );
}
