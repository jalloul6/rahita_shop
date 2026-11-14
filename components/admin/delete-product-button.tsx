"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/(admin)/admin/products/actions";
import type { ProductFormState } from "@/lib/products";
import { useAdminT } from "@/lib/i18n/admin-client";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const { t } = useAdminT();
  const [state, action, pending] = useActionState<ProductFormState, FormData>(deleteProduct, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        className="text-destructive"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(t.productForm.confirmDelete(name))) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
        {pending ? t.productForm.deleting : t.productForm.deleteProduct}
      </Button>
      {state.error && (
        <p role="alert" className="max-w-md text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
