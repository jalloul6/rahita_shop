"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveTheme, type ThemeState } from "@/app/(admin)/admin/appearance/actions";
import { THEMES, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/i18n/admin-client";

const SWATCHES = [
  { token: "bg-background", label: "background" },
  { token: "bg-card", label: "cards" },
  { token: "bg-primary", label: "buttons" },
  { token: "bg-highlight", label: "accent" },
  { token: "bg-hero", label: "banner" },
] as const;

export function ThemePicker({ current }: { current: ThemeId }) {
  const { t: tr } = useAdminT();
  const a = tr.appearance;
  const [state, action, pending] = useActionState<ThemeState, FormData>(saveTheme, {});
  const [selected, setSelected] = useState<ThemeId>(current);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {THEMES.map((t) => {
          const active = selected === t.id;
          return (
            <label
              key={t.id}
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-xl border-2 bg-card transition-all",
                active ? "border-primary shadow-md" : "border-border hover:border-muted-foreground/40"
              )}
            >
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={active}
                onChange={() => setSelected(t.id)}
                className="sr-only"
              />

              {/* Live mini preview: data-theme pulls the real storefront CSS variables */}
              <div data-theme={t.id} className="space-y-3 bg-background p-4 text-foreground">
                <div className="flex items-center justify-between rounded-md bg-hero px-3 py-1.5 text-xs text-hero-foreground">
                  <span className="font-heading font-semibold">Rahita</span>
                  <span>{a.previewNav}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 rounded-lg border bg-card p-2">
                      <div className="aspect-square rounded-md bg-muted" />
                      <div className="h-1.5 w-3/4 rounded bg-muted-foreground/40" />
                      <div className="text-[0.65rem] font-semibold text-highlight">$45.00</div>
                      <div className="rounded-md bg-primary py-1 text-center text-[0.6rem] font-medium text-primary-foreground">
                        {a.addToCart}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {SWATCHES.map((s) => (
                    <span
                      key={s.token}
                      title={a.swatches[s.label]}
                      className={cn("size-6 rounded-full border border-foreground/15 shadow-sm", s.token)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 border-t p-4">
                <div>
                  <div className="font-medium">{a.themes[t.id].name}</div>
                  <p className="text-sm text-muted-foreground">{a.themes[t.id].description}</p>
                </div>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                  aria-hidden="true"
                >
                  {active && <Check className="size-3.5" />}
                </span>
              </div>
              {current === t.id && (
                <span className="absolute end-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow">
                  {a.live}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || selected === current}>
          {pending ? tr.common.saving : a.saveTheme}
        </Button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm underline-offset-4 hover:underline">
          {tr.common.openStore}
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
