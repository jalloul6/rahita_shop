"use client";

import { useActionState, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings, type SettingsState } from "@/app/(admin)/admin/settings/actions";
import { IMAGE_TYPES } from "@/lib/products";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import type { ShopSettings } from "@/types/database";

type Values = Partial<ShopSettings>;

export function SettingsForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [heroImage, setHeroImage] = useState(initial.hero_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const val = (k: keyof ShopSettings) => (typeof initial[k] === "string" ? (initial[k] as string) : "");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const result = await uploadImage(file, "hero");
    setUploading(false);
    if (result.error) setUploadError(result.error);
    else if (result.url) setHeroImage(result.url);
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="hero_image_url" value={heroImage} />

      <Section title="Contact & payments" hint="Used across the store, WhatsApp buttons and the Whish Money checkout box.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number (orders & receipts)" id="whatsapp_number" error={err("whatsapp_number")}>
            <Input id="whatsapp_number" name="whatsapp_number" type="tel" dir="ltr" placeholder="+961 70 000 000" defaultValue={val("whatsapp_number")} />
          </Field>
          <Field label="Whish Money number" id="whish_number" error={err("whish_number")}>
            <Input id="whish_number" name="whish_number" type="tel" dir="ltr" placeholder="70 000 000" defaultValue={val("whish_number")} />
          </Field>
          <Field label="Instagram link" id="instagram_url" error={err("instagram_url")}>
            <Input id="instagram_url" name="instagram_url" dir="ltr" placeholder="https://instagram.com/yourshop" defaultValue={val("instagram_url")} />
          </Field>
        </div>
        <Bilingual
          label="Footer copyright text"
          name="copyright"
          initial={initial}
          err={err}
          placeholder={{ en: "© Rahita. All rights reserved.", ar: "© رحيتا. جميع الحقوق محفوظة." }}
        />
      </Section>

      <Section title="Announcement bar" hint="The strip at the very top of the store, e.g. a delivery deal or a bundle offer.">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="announcement_enabled"
            defaultChecked={initial.announcement_enabled ?? true}
            className="size-4 accent-primary"
          />
          Show the announcement bar
        </label>
        <Bilingual
          label="Announcement text"
          name="announcement"
          initial={initial}
          err={err}
          placeholder={{ en: "Free delivery on orders above $50", ar: "توصيل مجاني للطلبات فوق 50$" }}
        />
      </Section>

      <Section title="Hero banner" hint="The big banner at the top of the home page. Empty fields use the built-in text.">
        <div className="space-y-2">
          <Label>Cover image</Label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-28 w-48 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {heroImage ? "Replace" : "Upload"}
                <input type="file" accept={Object.keys(IMAGE_TYPES).join(",")} className="sr-only" onChange={onFile} disabled={uploading} />
              </label>
              {heroImage && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setHeroImage("")}>
                  <X className="size-4" /> Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Wide photo recommended (e.g. 1600×800). A dark overlay keeps the text readable.</p>
          {(uploadError || err("hero_image_url")) && <p className="text-sm text-destructive">{uploadError || err("hero_image_url")}</p>}
        </div>
        <Bilingual label="Title" name="hero_title" initial={initial} err={err} placeholder={{ en: "Find a scent, or a gift, they'll remember.", ar: "عطرٌ أو هديّة… تبقى في الذاكرة." }} />
        <Bilingual label="Description" name="hero_text" initial={initial} err={err} multiline />
        <Bilingual label="Button text" name="hero_cta" initial={initial} err={err} placeholder={{ en: "Shop now", ar: "تسوّق الآن" }} />
        <Field label="Button link" id="hero_cta_url" error={err("hero_cta_url")}>
          <Input id="hero_cta_url" name="hero_cta_url" dir="ltr" placeholder="/products" defaultValue={val("hero_cta_url")} />
        </Field>
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-4 backdrop-blur">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm underline-offset-4 hover:underline">
          Open store in a new tab
        </a>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// English + Arabic inputs side by side; Arabic is typed right-to-left.
function Bilingual({
  label,
  name,
  initial,
  err,
  placeholder,
  multiline,
}: {
  label: string;
  name: string;
  initial: Values;
  err: (f: string) => string | undefined;
  placeholder?: { en: string; ar: string };
  multiline?: boolean;
}) {
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["en", "ar"] as const).map((lang) => {
        const key = `${name}_${lang}` as keyof ShopSettings;
        const value = initial[key];
        return (
          <Field key={lang} label={`${label} (${lang === "en" ? "English" : "العربية"})`} id={key} error={err(key)}>
            <Control
              id={key}
              name={key}
              dir={lang === "ar" ? "rtl" : "ltr"}
              lang={lang}
              placeholder={placeholder?.[lang]}
              defaultValue={typeof value === "string" ? value : ""}
              {...(multiline ? { rows: 2 } : {})}
            />
          </Field>
        );
      })}
    </div>
  );
}
