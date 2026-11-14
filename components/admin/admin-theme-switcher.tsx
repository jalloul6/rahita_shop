"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import {
  ADMIN_THEMES,
  ADMIN_THEME_COOKIE,
  DEFAULT_DARK_ADMIN_THEME,
  isAdminTheme,
  isDarkAdminTheme,
  type AdminTheme,
} from "@/lib/admin-theme";
import { useAdminT } from "@/lib/i18n/admin-client";
import { cn } from "@/lib/utils";

const LAST_DARK_KEY = "admin_last_dark_theme";

function useSetTheme() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function setTheme(theme: AdminTheme) {
    document.cookie = `${ADMIN_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
    if (isDarkAdminTheme(theme)) {
      try {
        localStorage.setItem(LAST_DARK_KEY, theme);
      } catch {
        // storage blocked: the toggle falls back to the default dark theme
      }
    }
    startTransition(() => router.refresh());
  }
  return { setTheme, pending };
}

// Sun / moon button: Clean Light <-> the last dark theme used (Shopify Dark by default).
export function AdminDarkToggle({ theme, className }: { theme: AdminTheme; className?: string }) {
  const { t } = useAdminT();
  const { setTheme, pending } = useSetTheme();
  const dark = isDarkAdminTheme(theme);

  function toggle() {
    if (dark) return setTheme("clean");
    let last: unknown = null;
    try {
      last = localStorage.getItem(LAST_DARK_KEY);
    } catch {
      // ignore
    }
    setTheme(isAdminTheme(last) && isDarkAdminTheme(last) ? last : DEFAULT_DARK_ADMIN_THEME);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={dark ? t.nav.toLight : t.nav.toDark}
      title={dark ? t.nav.toLight : t.nav.toDark}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-muted",
        pending && "opacity-60",
        className
      )}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

// Theme list for the sidebar.
export function AdminThemeSelect({ theme, className }: { theme: AdminTheme; className?: string }) {
  const { t } = useAdminT();
  const { setTheme, pending } = useSetTheme();

  return (
    <select
      value={theme}
      disabled={pending}
      aria-label={t.nav.themeLabel}
      title={t.nav.themeLabel}
      onChange={(e) => isAdminTheme(e.target.value) && setTheme(e.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        pending && "opacity-60",
        className
      )}
    >
      {ADMIN_THEMES.map((id) => (
        <option key={id} value={id}>
          {t.nav.themes[id]}
        </option>
      ))}
    </select>
  );
}
