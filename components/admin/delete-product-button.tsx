"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/(admin)/admin/products/actions";
import type { ProductFormState } from "@/lib/products";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
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
          if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.`)) e.preventDefault();
        }}
      >
        <Trash2 className="size-4" />
        {pending ? "Deleting…" : "Delete product"}
      </Button>
      {state.error && (
        <p role="alert" className="max-w-md text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
