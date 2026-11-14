// Constants and types shared by server and client (keep free of heavy imports).

export const LOW_STOCK = 5; // storefront "Only N left" badge
export const ALERT_STOCK = 3; // admin dashboard low-stock alert
// "-20%" style discount when a compare-at price is set above the selling price, else null.
export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ProductFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
