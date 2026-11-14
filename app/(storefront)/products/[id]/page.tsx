import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, ChevronRight, ImageIcon, Smartphone, Truck } from "lucide-react";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { getStoreProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { LOW_STOCK, discountPercent } from "@/lib/products";
import { cn } from "@/lib/utils";

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">…</p>}>
      <Product params={props.params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/products/[id]">["params"] }) {
  const [{ id }, t] = await Promise.all([params, getDictionary()]);
  const product = await getStoreProduct(id);
  if (!product) notFound();

  const stock = product.stock_quantity;
  const off = discountPercent(product.price, product.compare_at_price);
  const categoryHref = `/products?category=${encodeURIComponent(product.category)}`;

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          {t.header.shop}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" />
        <Link href={categoryHref} className="hover:text-foreground">
          {product.category}
        </Link>
        <ChevronRight className="size-4 rtl:rotate-180" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl border bg-muted md:sticky md:top-24 md:self-start">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-16 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-6 md:py-4">
          <div className="space-y-3">
            <Link
              href={categoryHref}
              className="text-xs font-semibold tracking-[0.2em] text-highlight uppercase hover:underline"
            >
              {product.category}
            </Link>
            <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <span className={cn("text-2xl font-semibold sm:text-3xl", off !== null && "text-destructive")}>
                <bdi>{formatMoney(product.price)}</bdi>
              </span>
              {off !== null && (
                <>
                  <s className="text-lg text-muted-foreground" aria-label={t.product.wasPrice}>
                    <bdi>{formatMoney(product.compare_at_price!)}</bdi>
                  </s>
                  <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-white">
                    {t.product.sale} <bdi>-{off}%</bdi>
                  </span>
                </>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                stock < 1
                  ? "bg-destructive/10 text-destructive"
                  : stock <= LOW_STOCK
                    ? "bg-amber-100 text-amber-900"
                    : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {stock < 1 ? t.product.outOfStock : stock <= LOW_STOCK ? t.product.onlyLeft(stock) : t.product.inStock}
            </span>
          </div>

          <AddToCart product={product} />

          {product.description && (
            <div className="space-y-2 border-t pt-6">
              <h2 className="text-sm font-semibold">{t.product.description}</h2>
              <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground">{product.description}</p>
            </div>
          )}

          <ul className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Banknote className="size-4 text-highlight" /> {t.product.cod}
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="size-4 text-highlight" /> {t.product.whish}
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-highlight" /> {t.product.delivery}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
