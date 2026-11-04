import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ImageIcon, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/format";
import { LOW_STOCK } from "@/lib/products";
import { cn } from "@/lib/utils";
import { setActive, setSponsored } from "./actions";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage catalog, stock and featured items.</p>
        </div>
        <Link href="/admin/products/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          New product
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading products…</p>}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}

async function ProductsTable() {
  const { products, error } = await getAdminProducts();

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Could not load products: {error}
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No products yet. Create your first one.
              </TableCell>
            </TableRow>
          ) : (
            products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="size-5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(p.price)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.stock_quantity === 0 ? (
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">Out of stock</Badge>
                  ) : p.stock_quantity <= LOW_STOCK ? (
                    <span className="font-medium text-amber-700 dark:text-amber-300">{p.stock_quantity} (low)</span>
                  ) : (
                    p.stock_quantity
                  )}
                </TableCell>
                <TableCell>
                  <form action={setSponsored}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="value" value={String(!p.is_sponsored)} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={p.is_sponsored ? "Remove from featured" : "Add to featured"}
                      aria-pressed={p.is_sponsored}
                    >
                      <Star className={cn("size-4", p.is_sponsored && "fill-amber-400 text-amber-500")} />
                    </Button>
                  </form>
                </TableCell>
                <TableCell>
                  <form action={setActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="value" value={String(!p.is_active)} />
                    <Button type="submit" variant="ghost" size="sm" title={p.is_active ? "Click to hide" : "Click to show"}>
                      {p.is_active ? "Visible" : <span className="text-muted-foreground">Hidden</span>}
                    </Button>
                  </form>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/products/${p.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
