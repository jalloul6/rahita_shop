import { z } from "zod";
import { IMAGE_BUCKET } from "@/lib/products";

// Only images uploaded to our own bucket are accepted as image_url.
const IMAGE_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/`;

export const number = (label: string, opts: { int?: boolean; max: number }) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform(Number)
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .min(0, `${label} cannot be negative`)
        .max(opts.max, `${label} is too large`)
        .refine((n) => !opts.int || Number.isInteger(n), `${label} must be a whole number`)
    );

export const zoneSchema = z.object({
  zone_name: z.string().trim().min(1, "Zone name is required").max(100),
  delivery_fee: number("Delivery fee", { max: 100_000 }).transform((n) => Math.round(n * 100) / 100),
  is_active: z.boolean(),
});

export const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3–30 letters, numbers, - or _")),
    discount_type: z.enum(["percentage", "fixed"], { error: "Choose a discount type" }),
    discount_value: number("Discount value", { max: 100_000 }).transform((n) => Math.round(n * 100) / 100),
    is_active: z.boolean(),
  })
  .refine((p) => p.discount_value > 0, { message: "Discount value must be greater than 0", path: ["discount_value"] })
  .refine((p) => p.discount_type !== "percentage" || p.discount_value <= 100, {
    message: "A percentage discount can't exceed 100",
    path: ["discount_value"],
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[0-9+ ()-]{7,20}$/.test(v), "Enter a valid phone number")
  .transform((v) => v || null);

// /admin/settings: contact & payment numbers, announcement bar, hero banner (EN + AR)
export const settingsSchema = z.object({
  whatsapp_number: optionalPhone,
  whish_number: optionalPhone,
  instagram_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._\/-]+$/.test(v), "Use a full https://instagram.com/... link")
    .transform((v) => v || null),
  copyright_en: optionalText(200),
  copyright_ar: optionalText(200),
  announcement_enabled: z.boolean(),
  announcement_en: optionalText(200),
  announcement_ar: optionalText(200),
  hero_image_url: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith(IMAGE_URL_PREFIX), "Invalid image")
    .transform((v) => v || null),
  hero_title_en: optionalText(120),
  hero_title_ar: optionalText(120),
  hero_text_en: optionalText(300),
  hero_text_ar: optionalText(300),
  hero_cta_en: optionalText(40),
  hero_cta_ar: optionalText(40),
  hero_cta_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\/[A-Za-z0-9/_?=&#%.-]*$/.test(v) || /^https:\/\/\S+$/.test(v), "Use a page path like /products or a full https:// link")
    .transform((v) => v || null),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => v || null),
  price: number("Price", { max: 1_000_000 }).transform((n) => Math.round(n * 100) / 100),
  stock_quantity: number("Stock", { int: true, max: 1_000_000 }),
  category: z.string().trim().min(1, "Category is required").max(60),
  image_url: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith(IMAGE_URL_PREFIX), "Invalid image")
    .transform((v) => v || null),
  is_sponsored: z.boolean(),
  is_active: z.boolean(),
  is_on_offer: z.boolean(),
  // Optional "was" price shown struck through; must be above the selling price to mean anything.
  compare_at_price: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: "Compare-at price must be a positive number" });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
}).refine((p) => p.compare_at_price === null || p.compare_at_price > p.price, {
  message: "Compare-at price must be higher than the price (or leave it empty)",
  path: ["compare_at_price"],
});
