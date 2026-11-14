"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updatePaymentStatus, type StatusState } from "@/app/(admin)/admin/orders/actions";
import { useAdminT } from "@/lib/i18n/admin-client";
import type { PaymentStatus } from "@/types/database";

export function PaymentActions({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(updatePaymentStatus, {});
  const { t } = useAdminT();
  const target: PaymentStatus = status === "paid" ? "pending" : "paid";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="payment_status" value={target} />
      <Button
        type="submit"
        size="sm"
        variant={target === "paid" ? "default" : "outline"}
        disabled={pending}
        onClick={(e) => {
          if (target === "pending" && !window.confirm(t.order.confirmUnpaid)) e.preventDefault();
        }}
      >
        {pending ? t.common.saving : target === "paid" ? t.order.markPaid : t.order.markUnpaid}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
