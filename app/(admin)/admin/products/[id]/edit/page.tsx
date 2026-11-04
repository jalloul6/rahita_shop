import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getProduct } from "@/lib/data/products";
import { updateProduct } from "../../actions";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <EditProduct params={props.params} />
      </Suspense>
    </div>
  );
}

async function EditProduct({ params }: { params: PageProps<"/admin/products/[id]/edit">["params"] }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();

  return (
    <>
      <ProductForm action={updateProduct} product={product} categories={categories} />
      <div className="max-w-2xl border-t pt-6">
        <DeleteProductButton id={product.id} name={product.name} />
      </div>
    </>
  );
}
