"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { DARK_THEME, MODE_COOKIE, isColorMode, lightThemeFor, type ColorMode, type ThemeId } from "@/lib/themes";

function saveMode(mode: ColorMode) {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(MODE_COOKIE, mode);
  } catch {
    // storage blocked: the cookie is enough
  }
}

// Sun / moon button. The server already rendered the visitor's saved mode (from the cookie),
// so this only handles clicks, plus restoring a localStorage choice if the cookie was lost.
export function ThemeToggle({ shopTheme, activeTheme }: { shopTheme: ThemeId; activeTheme: ThemeId }) {
  const { t } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();
  // The header passes key={activeTheme}, so this resets whenever the server renders a new theme.
  const [dark, setDark] = useState(activeTheme === DARK_THEME);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(MODE_COOKIE);
    } catch {
      return;
    }
    const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${MODE_COOKIE}=`));
    if (isColorMode(stored) && !hasCookie) {
      saveMode(stored);
      startTransition(() => router.refresh());
    }
  }, [router]);

  function toggle() {
    const next: ColorMode = dark ? "light" : "dark";
    // Repaint instantly, then let the server re-render with the new cookie so they stay in sync.
    const wrapper = document.querySelector<HTMLElement>("[data-store-root]");
    if (wrapper) wrapper.dataset.theme = next === "dark" ? DARK_THEME : lightThemeFor(shopTheme);
    setDark(next === "dark");
    saveMode(next);
    startTransition(() => router.refresh());
  }

  const label = dark ? t.header.lightMode : t.header.darkMode;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={dark}
      className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
