import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { getStoreProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { LOW_STOCK } from "@/lib/products";

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Product params={props.params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/products/[id]">["params"] }) {
  const { id } = await params;
  const product = await getStoreProduct(id);
  if (!product) notFound();

  const stock = product.stock_quantity;

  return (
    <div className="space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to shop
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-16 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-5">
          <div>
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {product.category}
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
          </div>
          <div className="text-2xl font-semibold tabular-nums">{formatMoney(product.price)}</div>
          <p
            className={
              stock < 1
                ? "text-sm font-medium text-destructive"
                : stock <= LOW_STOCK
                  ? "text-sm font-medium text-amber-700 dark:text-amber-300"
                  : "text-sm text-green-700 dark:text-green-400"
            }
          >
            {stock < 1 ? "Out of stock" : stock <= LOW_STOCK ? `Only ${stock} left` : "In stock"}
          </p>
          <AddToCart product={product} />
          {product.description && (
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{product.description}</p>
          )}
          <p className="text-sm text-muted-foreground">Cash on delivery. No online payment needed.</p>
        </div>
      </div>
    </div>
  );
}
