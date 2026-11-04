import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories } from "@/lib/data/products";
import { createProduct } from "../actions";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}

async function NewProductForm() {
  const categories = await getCategories();
  return <ProductForm action={createProduct} categories={categories} />;
}
