"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === "ar" ? "en" : "ar";

  function switchLanguage() {
    // Cookie so the server renders the right language; localStorage as a client-side backup.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LOCALE_COOKIE, next);
    } catch {
      // storage blocked: the cookie is enough
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={pending}
      aria-label={t.header.switchAria}
      lang={next}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3",
        pending && "opacity-60",
        next === "ar" && "font-[family-name:var(--font-cairo)]"
      )}
    >
      <Languages className="size-4" />
      {/* Icon only on phones to leave room for the logo + store name; aria-label names the action */}
      <span className="hidden sm:inline">{t.header.switchLabel}</span>
    </button>
  );
}
