"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useAdminT } from "@/lib/i18n/admin-client";
import { ADMIN_LOCALE_COOKIE } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";

export function AdminLanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useAdminT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  function switchLanguage() {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(ADMIN_LOCALE_COOKIE, next);
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
      aria-label={t.nav.switchAria}
      lang={next}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
        pending && "opacity-60",
        next === "ar" && "font-[family-name:var(--font-cairo)]",
        className
      )}
    >
      <Languages className="size-4" />
      {t.nav.switchLabel}
    </button>
  );
}
