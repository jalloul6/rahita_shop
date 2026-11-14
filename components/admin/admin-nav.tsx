"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Package, Palette, PlusCircle, Settings, ShoppingBag, TicketPercent, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: typeof ShoppingBag; exact?: boolean; exclude?: string }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders/new", label: "New Order", icon: PlusCircle, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exclude: "/admin/orders/new" },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/zones", label: "Shipping Zones", icon: MapPin },
  { href: "/admin/promos", label: "Promo Codes", icon: TicketPercent },
  { href: "/admin/appearance", label: "Appearance", icon: Palette },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
