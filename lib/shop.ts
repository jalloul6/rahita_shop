// Built-in shop defaults. The store name and tagline can be changed (EN/AR) in /admin/settings;
// these are only the fallbacks used when those fields are empty.
export const SHOP_NAME = "Rahita";
export const SHOP_NAME_AR = "رحيتا";
export const SHOP_TAGLINE = "Perfumes & Gifts";
export const SHOP_TAGLINE_AR = "عطور وهدايا";
// IANA timezone that defines "today" / "this month" on the admin dashboard.
export const SHOP_TIMEZONE = "Asia/Beirut";
export const SHOP_PHONE = ""; // e.g. "+961 70 000 000"; leave empty to hide

// Whish Money account customers transfer to (shown at checkout with a Copy button).
export const WHISH_NUMBER = process.env.NEXT_PUBLIC_WHISH_NUMBER || "70XXXXXX";
// WhatsApp number that receives payment receipts: international format, digits only (961 = Lebanon).
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "96170000000").replace(/\D/g, "");

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
