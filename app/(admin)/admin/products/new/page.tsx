import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdminT } from "@/lib/i18n/admin-server";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories } from "@/lib/data/products";
import { createProduct } from "../actions";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <Title />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}

async function NewProductForm() {
  const categories = await getCategories();
  return <ProductForm action={createProduct} categories={categories} />;
}

async function Title() {
  const t = await getAdminT();
  return <h1 className="text-2xl font-semibold tracking-tight">{t.products.newProduct}</h1>;
}
