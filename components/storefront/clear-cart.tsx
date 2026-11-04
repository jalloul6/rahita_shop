"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

export function ClearCart() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}
