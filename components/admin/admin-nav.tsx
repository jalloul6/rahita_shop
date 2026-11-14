"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Package, Palette, PlusCircle, Settings, ShoppingBag, TicketPercent, Users } from "lucide-react";
import { useAdminT } from "@/lib/i18n/admin-client";
import type { AdminDict } from "@/lib/i18n/admin";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: keyof AdminDict["nav"]; icon: typeof ShoppingBag; exact?: boolean; exclude?: string }[] = [
  { href: "/admin", label: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders/new", label: "newOrder", icon: PlusCircle, exact: true },
  { href: "/admin/orders", label: "orders", icon: ShoppingBag, exclude: "/admin/orders/new" },
  { href: "/admin/customers", label: "customers", icon: Users },
  { href: "/admin/products", label: "products", icon: Package },
  { href: "/admin/zones", label: "zones", icon: MapPin },
  { href: "/admin/promos", label: "promos", icon: TicketPercent },
  { href: "/admin/appearance", label: "appearance", icon: Palette },
  { href: "/admin/settings", label: "settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useAdminT();

  return (
    <nav className="flex gap-1 md:flex-col">
      {ITEMS.map(({ href, label, icon: Icon, exact, exclude }) => {
        const active = exact ? pathname === href : pathname.startsWith(href) && pathname !== exclude;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {t.nav[label]}
          </Link>
        );
      })}
    </nav>
  );
}
