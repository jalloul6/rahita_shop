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
import { useAdminT } from "@/lib/i18n/admin-client";
import { translateValidation } from "@/lib/i18n/admin";
import type { ShopSettings } from "@/types/database";

type Values = Partial<ShopSettings>;

export function SettingsForm({ initial }: { initial: Values }) {
  const { t } = useAdminT();
  const s = t.settings;
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  const [heroImage, setHeroImage] = useState(initial.hero_image_url ?? "");
  const [logo, setLogo] = useState(initial.logo_url ?? "");
  const [uploading, setUploading] = useState(0); // number of uploads in progress
  const err = (f: string) => translateValidation(state.fieldErrors?.[f]?.[0], t);
  const val = (k: keyof ShopSettings) => (typeof initial[k] === "string" ? (initial[k] as string) : "");

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="hero_image_url" value={heroImage} />
      <input type="hidden" name="logo_url" value={logo} />

      <Section title={s.branding} hint={s.brandingHint}>
        <ImagePicker
          label={s.logo}
          hint={s.logoHint}
          folder="logo"
          value={logo}
          onChange={setLogo}
          onBusy={(d) => setUploading((n) => n + d)}
          error={err("logo_url")}
          previewClass="h-20 w-48 bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2"
          fit="object-contain"
        />
        <Bilingual label={s.storeName} name="store_name" initial={initial} err={err} placeholder={{ en: "Rahita", ar: "رحيتا" }} />
        <Bilingual label={s.tagline} name="tagline" initial={initial} err={err} placeholder={{ en: "Perfumes & Gifts", ar: "عطور وهدايا" }} />
      </Section>

      <Section title={s.contact} hint={s.contactHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={s.whatsapp} id="whatsapp_number" error={err("whatsapp_number")}>
            <Input id="whatsapp_number" name="whatsapp_number" type="tel" dir="ltr" placeholder="+961 70 000 000" defaultValue={val("whatsapp_number")} />
          </Field>
          <Field label={s.whish} id="whish_number" error={err("whish_number")}>
            <Input id="whish_number" name="whish_number" type="tel" dir="ltr" placeholder="70 000 000" defaultValue={val("whish_number")} />
          </Field>
          <Field label={s.instagram} id="instagram_url" error={err("instagram_url")}>
            <Input id="instagram_url" name="instagram_url" dir="ltr" placeholder="https://instagram.com/yourshop" defaultValue={val("instagram_url")} />
          </Field>
        </div>
        <Bilingual
          label={s.copyright}
          name="copyright"
          initial={initial}
          err={err}
          placeholder={{ en: "© Rahita. All rights reserved.", ar: "© رحيتا. جميع الحقوق محفوظة." }}
        />
      </Section>

      <Section title={s.announcement} hint={s.announcementHint}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="announcement_enabled"
            defaultChecked={initial.announcement_enabled ?? true}
            className="size-4 accent-primary"
          />
          {s.showAnnouncement}
        </label>
        <Bilingual
          label={s.announcementText}
          name="announcement"
          initial={initial}
          err={err}
          placeholder={{ en: "Free delivery on orders above $50", ar: "توصيل مجاني للطلبات فوق 50$" }}
        />
      </Section>

      <Section title={s.hero} hint={s.heroHint}>
        <ImagePicker
          label={s.cover}
          hint={s.coverHint}
          folder="hero"
          value={heroImage}
          onChange={setHeroImage}
          onBusy={(d) => setUploading((n) => n + d)}
          error={err("hero_image_url")}
          previewClass="h-28 w-48 bg-muted"
          fit="object-cover"
        />
        <Bilingual label={s.heroTitle} name="hero_title" initial={initial} err={err} placeholder={{ en: "Find a scent, or a gift, they'll remember.", ar: "عطرٌ أو هديّة… تبقى في الذاكرة." }} />
        <Bilingual label={s.heroText} name="hero_text" initial={initial} err={err} multiline />
        <Bilingual label={s.ctaText} name="hero_cta" initial={initial} err={err} placeholder={{ en: "Shop now", ar: "تسوّق الآن" }} />
        <Field label={s.ctaUrl} id="hero_cta_url" error={err("hero_cta_url")}>
          <Input id="hero_cta_url" name="hero_cta_url" dir="ltr" placeholder="/products" defaultValue={val("hero_cta_url")} />
        </Field>
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background/95 py-4 backdrop-blur">
        <Button type="submit" disabled={pending || uploading > 0}>
          {pending ? t.common.saving : s.saveSettings}
        </Button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm underline-offset-4 hover:underline">
          {t.common.openStore}
        </a>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && <p className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
      </div>
    </form>
  );
}

// Image upload to Storage with preview, Replace and Remove. The URL is saved with the form.
function ImagePicker({
  label,
  hint,
  folder,
  value,
  onChange,
  onBusy,
  error,
  previewClass,
  fit,
}: {
  label: string;
  hint: string;
  folder: string;
  value: string;
  onChange: (url: string) => void;
  onBusy: (delta: 1 | -1) => void;
  error?: string;
  previewClass: string;
  fit: "object-cover" | "object-contain";
}) {
  const { t } = useAdminT();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    onBusy(1);
    const result = await uploadImage(file, folder, { type: t.msg.imageType, size: t.msg.imageSize });
    setUploading(false);
    onBusy(-1);
    if (result.error) setUploadError(result.error);
    else if (result.url) onChange(result.url);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div className={cn("flex items-center justify-center overflow-hidden rounded-lg border", previewClass)}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={cn("size-full", fit)} />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {value ? t.common.replace : t.common.upload}
            <input type="file" accept={Object.keys(IMAGE_TYPES).join(",")} className="sr-only" onChange={onFile} disabled={uploading} />
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="size-4" /> {t.common.remove}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {(uploadError || error) && <p className="text-sm text-destructive">{uploadError || error}</p>}
    </div>
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
  const { t } = useAdminT();
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["en", "ar"] as const).map((lang) => {
        const key = `${name}_${lang}` as keyof ShopSettings;
        const value = initial[key];
        return (
          <Field key={lang} label={`${label} (${lang === "en" ? t.settings.english : t.settings.arabic})`} id={key} error={err(key)}>
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
