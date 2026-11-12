import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@/types/database";

export function PaymentBadge({ method, status }: { method: PaymentMethod; status: PaymentStatus }) {
  const paid = status === "paid";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs font-medium">{method === "whish" ? "Whish" : "COD"}</span>
      <Badge
        variant="outline"
        className={cn(
          "font-medium",
          paid
            ? "border-green-300 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300"
            : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        )}
        title={PAYMENT_METHOD_LABELS[method]}
      >
        {paid ? "Paid" : "Unpaid"}
      </Badge>
    </div>
  );
}
