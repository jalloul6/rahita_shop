import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { QuickAdd } from "@/components/storefront/add-to-cart";
import type { StoreProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LOW_STOCK, discountPercent } from "@/lib/products";

export function ProductCard({ product, t }: { product: StoreProduct; t: Dictionary }) {
  const out = product.stock_quantity < 1;
  const low = !out && product.stock_quantity <= LOW_STOCK;
  const off = discountPercent(product.price, product.compare_at_price);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-xl hover:shadow-foreground/5">
      <Link href={`/products/${product.id}`} className="block focus-visible:outline-none">
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-muted">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}
          {off !== null && (
            <span className="absolute end-2 top-2 rounded-full bg-destructive px-2.5 py-0.5 text-[0.7rem] font-bold text-white" dir="ltr">
              -{off}%
            </span>
          )}
          <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
            {product.is_sponsored && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-primary-foreground uppercase">
                {t.product.featuredBadge}
              </span>
            )}
            {out && (
              <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-[0.7rem] font-medium text-foreground backdrop-blur">
                {t.product.outOfStock}
              </span>
            )}
            {low && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.7rem] font-medium text-amber-900">
                {t.product.onlyLeft(product.stock_quantity)}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1 p-3 sm:p-4">
          <div className="text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">{product.category}</div>
          <h3 className="line-clamp-2 min-h-[2.5em] text-sm leading-tight font-medium sm:text-base">{product.name}</h3>
          <div className="flex flex-wrap items-baseline gap-x-2 pt-0.5 tabular-nums">
            <span className={off !== null ? "font-semibold text-destructive" : "font-semibold text-highlight"}>
              {formatMoney(product.price)}
            </span>
            {off !== null && (
              <s className="text-sm text-muted-foreground" aria-label={t.product.wasPrice}>
                {formatMoney(product.compare_at_price!)}
              </s>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4">
        <QuickAdd product={product} />
      </div>
    </article>
  );
}

export function ProductGrid({ products, t }: { products: StoreProduct[]; t: Dictionary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} t={t} />
      ))}
    </div>
  );
}
