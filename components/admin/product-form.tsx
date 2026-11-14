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
import { useAdminT } from "@/lib/i18n/admin-client";
import { translateValidation } from "@/lib/i18n/admin";
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
  const { t } = useAdminT();
  const f = t.productForm;
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});
  const [imageUrl, setImageUrl] = useState(state.values?.image_url ?? product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const v = state.values;
  const err = (field: string) => translateValidation(state.fieldErrors?.[field]?.[0], t);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");

    const ext = IMAGE_TYPES[file.type];
    if (!ext) return setUploadError(t.msg.imageType);
    if (file.size > MAX_IMAGE_BYTES) return setUploadError(t.msg.imageSize);

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

      <Field label={t.common.name} htmlFor="name" error={err("name")}>
        <Input id="name" name="name" required maxLength={200} defaultValue={v?.name ?? product?.name ?? ""} />
      </Field>

      <Field label={f.description} htmlFor="description" error={err("description")}>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={v?.description ?? product?.description ?? ""}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t.common.price} htmlFor="price" error={err("price")}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            required
            defaultValue={v?.price ?? (product ? String(product.price) : "")}
          />
        </Field>
        <Field label={f.compareAt} htmlFor="compare_at_price" error={err("compare_at_price")}>
          <Input
            id="compare_at_price"
            name="compare_at_price"
            inputMode="decimal"
            placeholder={f.originalPrice}
            defaultValue={v?.compare_at_price ?? (product?.compare_at_price != null ? String(product.compare_at_price) : "")}
          />
        </Field>
        <Field label={f.stockQty} htmlFor="stock_quantity" error={err("stock_quantity")}>
          <Input
            id="stock_quantity"
            name="stock_quantity"
            inputMode="numeric"
            required
            defaultValue={v?.stock_quantity ?? (product ? String(product.stock_quantity) : "0")}
          />
        </Field>
        <Field label={t.products.category} htmlFor="category" error={err("category")}>
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
        <Label>{t.products.image}</Label>
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
                {imageUrl ? t.common.replace : t.common.upload}
                <input type="file" accept={Object.keys(IMAGE_TYPES).join(",")} className="sr-only" onChange={onFile} disabled={uploading} />
              </label>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                  <X className="size-4" /> {t.common.remove}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t.common.imageHint}</p>
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
          label={f.sponsored}
          hint={f.sponsoredHint}
          defaultChecked={v ? v.is_sponsored === "on" : (product?.is_sponsored ?? false)}
        />
        <Check
          name="is_on_offer"
          label={f.onOffer}
          hint={f.onOfferHint}
          defaultChecked={v ? v.is_on_offer === "on" : (product?.is_on_offer ?? false)}
        />
        <Check
          name="is_active"
          label={f.visible}
          hint={f.visibleHint}
          defaultChecked={v ? v.is_active === "on" : (product?.is_active ?? true)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? t.common.saving : product ? f.saveChanges : f.create}
        </Button>
        <Link href="/admin/products" className={cn(buttonVariants({ variant: "ghost" }))}>
          {t.common.cancel}
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
