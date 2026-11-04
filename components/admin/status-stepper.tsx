import { Check } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { FLOW, statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database";

export function StatusStepper({ status }: { status: OrderStatus }) {
  // Canceled / Returned leave the happy path, so show them as a single end state.
  if (status === "canceled" || status === "returned") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Final status:</span>
        <StatusBadge status={status} />
      </div>
    );
  }

  const current = FLOW.indexOf(status);

  return (
    <ol className="flex items-start" aria-label="Order progress">
      {FLOW.map((step, i) => {
        const done = i < current || status === "delivered";
        const active = i === current && status !== "delivered";
        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-primary" : "bg-border")} />
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-background text-primary",
                  !done && !active && "border-border bg-background text-muted-foreground"
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </div>
              <div className={cn("h-0.5 flex-1", i === FLOW.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-xs", active ? "font-semibold" : "text-muted-foreground")}>{statusLabel(step)}</span>
          </li>
        );
      })}
    </ol>
  );
}
