"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/i18n/admin-client";
import type { OrderStatus } from "@/types/database";

const STYLES: Record<OrderStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  processing: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300",
  out_for_delivery: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300",
  partially_returned: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
  delivered: "border-green-300 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300",
  returned: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300",
  canceled: "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useAdminT();
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {t.status[status]}
    </Badge>
  );
}
