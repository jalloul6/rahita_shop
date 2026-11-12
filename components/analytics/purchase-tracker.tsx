"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/pixels";

export function PurchaseTracker({ orderNumber, value, currency }: { orderNumber: string; value: number; currency: string }) {
  useEffect(() => {
    trackPurchase({ orderNumber, value, currency });
  }, [orderNumber, value, currency]);
  return null;
}
