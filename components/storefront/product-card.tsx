import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { QuickAdd } from "@/components/storefront/add-to-cart";
import type { StoreProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { LOW_STOCK } from "@/lib/products";

export function ProductCard({ product }: { product: StoreProduct }) {
  const out = product.stock_quantity < 1;
  const low = !out && product.stock_quantity <= LOW_STOCK;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <Link href={`/products/${product.id}`} className="group block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}
          {out && (
            <span className="absolute top-2 left-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Out of stock</span>
          )}
          {low && (
            <span className="absolute top-2 left-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Only {product.stock_quantity} left
            </span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <div className="text-xs text-muted-foreground">{product.category}</div>
          <h3 className="line-clamp-2 font-medium">{product.name}</h3>
          <div className="font-semibold tabular-nums">{formatMoney(product.price)}</div>
        </div>
      </Link>
      <div className="mt-auto p-3 pt-0">
        <QuickAdd product={product} />
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
