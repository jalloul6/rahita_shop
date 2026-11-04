"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateOrderStatus, type StatusState } from "@/app/(admin)/admin/orders/actions";
import { ACTION_LABELS, FLOW, allowedTransitions } from "@/lib/orders";
import type { OrderStatus } from "@/types/database";

const CONFIRM: Partial<Record<OrderStatus, string>> = {
  canceled: "Cancel this order? Reserved stock will be returned to inventory. This cannot be undone.",
  returned: "Mark this order as returned? Stock will be returned to inventory. This cannot be undone.",
};

export function StatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(updateOrderStatus, {});
  const options = allowedTransitions(status);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">This order is final; its status can no longer be changed.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap gap-2">
        {options.map((target) => {
          const forward = FLOW.includes(target) && target !== "pending";
          return (
            <Button
              key={target}
              type="submit"
              name="status"
              value={target}
              disabled={pending}
              variant={forward ? "default" : "outline"}
              className={forward ? undefined : "text-destructive"}
              onClick={(e) => {
                const message = CONFIRM[target];
                if (message && !window.confirm(message)) e.preventDefault();
              }}
            >
              {ACTION_LABELS[target]}
            </Button>
          );
        })}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
