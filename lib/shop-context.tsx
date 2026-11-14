"use client";

import { createContext, useContext } from "react";
import { WHATSAPP_NUMBER, WHISH_NUMBER } from "@/lib/shop";
import { waLink } from "@/lib/settings";

type ShopContact = { whatsappNumber: string; whishNumber: string };

const ShopContactContext = createContext<ShopContact>({ whatsappNumber: WHATSAPP_NUMBER, whishNumber: WHISH_NUMBER });

// Contact / payment numbers from /admin/settings, for storefront client components.
export function ShopContactProvider({ value, children }: { value: ShopContact; children: React.ReactNode }) {
  return <ShopContactContext value={value}>{children}</ShopContactContext>;
}

export function useShopContact() {
  const contact = useContext(ShopContactContext);
  return { ...contact, whatsappLink: (message: string) => waLink(contact.whatsappNumber, message) };
}
