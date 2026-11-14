"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateOrderStatus, type StatusState } from "@/app/(admin)/admin/orders/actions";
import { FLOW, allowedTransitions } from "@/lib/orders";
import { useAdminT } from "@/lib/i18n/admin-client";
import type { OrderStatus } from "@/types/database";

export function StatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(updateOrderStatus, {});
  const { t } = useAdminT();
  const options = allowedTransitions(status);
  const confirmText: Partial<Record<OrderStatus, string>> = { canceled: t.order.confirmCancel, returned: t.order.confirmReturned };

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.order.finalNote}</p>;
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
                const message = confirmText[target];
                if (message && !window.confirm(message)) e.preventDefault();
              }}
            >
              {t.statusAction[target]}
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
