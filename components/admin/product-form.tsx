"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES, type ProductFormState } from "@/lib/products";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Action = (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export function ProductForm({
  action,
  product,
  categories,
}: {
  action: Action;
  product?: Product;
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});
  const [imageUrl, setImageUrl] = useState(state.values?.image_url ?? product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const v = state.values;
  const err = (field: string) => state.fieldErrors?.[field]?.[0];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");

    const ext = IMAGE_TYPES[file.type];
    if (!ext) return setUploadError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_IMAGE_BYTES) return setUploadError("Image must be 5 MB or smaller.");

    setUploading(true);
    // Uploaded straight to Storage with the admin's session (RLS allows admins only),
    // which avoids server-action body size limits. File name is random, never user-supplied.
    const supabase = createClient();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);

    if (error) return setUploadError(error.message);
    setImageUrl(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="image_url" value={imageUrl} />

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Field label="Name" htmlFor="name" error={err("name")}>
        <Input id="name" name="name" required maxLength={200} defaultValue={v?.name ?? product?.name ?? ""} />
      </Field>

      <Field label="Description" htmlFor="description" error={err("description")}>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={v?.description ?? product?.description ?? ""}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Price" htmlFor="price" error={err("price")}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            required
            defaultValue={v?.price ?? (product ? String(product.price) : "")}
          />
        </Field>
        <Field label="Stock quantity" htmlFor="stock_quantity" error={err("stock_quantity")}>
          <Input
            id="stock_quantity"
            name="stock_quantity"
            inputMode="numeric"
            required
            defaultValue={v?.stock_quantity ?? (product ? String(product.stock_quantity) : "0")}
          />
        </Field>
        <Field label="Category" htmlFor="category" error={err("category")}>
          <Input
            id="category"
            name="category"
            list="category-options"
            required
            maxLength={60}
            defaultValue={v?.category ?? product?.category ?? ""}
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="space-y-2">
        <Label>Image</Label>
        <div className="flex items-center gap-4">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {imageUrl ? "Replace" : "Upload"}
                <input type="file" accept={Object.keys(IMAGE_TYPES).join(",")} className="sr-only" onChange={onFile} disabled={uploading} />
              </label>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                  <X className="size-4" /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
          </div>
        </div>
        {(uploadError || err("image_url")) && (
          <p role="alert" className="text-sm text-destructive">
            {uploadError || err("image_url")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Check
          name="is_sponsored"
          label="Sponsored / Featured"
          hint="Shown in the featured row on the home page."
          defaultChecked={v ? v.is_sponsored === "on" : (product?.is_sponsored ?? false)}
        />
        <Check
          name="is_active"
          label="Visible in store"
          hint="Untick to hide the product without deleting it."
          defaultChecked={v ? v.is_active === "on" : (product?.is_active ?? true)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        <Link href="/admin/products" className={cn(buttonVariants({ variant: "ghost" }))}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-primary" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
