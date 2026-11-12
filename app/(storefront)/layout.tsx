import Link from "next/link";
import { Banknote, Smartphone, Truck } from "lucide-react";
import { CartLink } from "@/components/storefront/cart-link";
import { getShopTheme } from "@/lib/data/storefront";
import { SHOP_NAME, SHOP_PHONE, SHOP_TAGLINE } from "@/lib/shop";

// The theme (chosen in /admin/appearance) is applied by data-theme on this wrapper, so it
// re-skins every storefront page through CSS variables while /admin keeps the default tokens.
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const theme = await getShopTheme();

  return (
    <div data-theme={theme} className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <div className="bg-hero text-hero-foreground">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium tracking-wide sm:text-sm">
          Cash on Delivery or Whish Money · Delivery across Lebanon
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="group flex flex-col leading-none">
            <span className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{SHOP_NAME}</span>
            <span className="hidden text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground sm:block">
              {SHOP_TAGLINE}
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/" className="rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground">
              Home
            </Link>
            <Link
              href="/products"
              className="rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Shop
            </Link>
            <CartLink />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">{children}</main>

      <footer className="mt-12 border-t bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="font-heading text-lg font-semibold">{SHOP_NAME}</div>
            <p className="text-sm text-muted-foreground">{SHOP_TAGLINE}. Hand-picked scents and gifts, delivered to your door.</p>
            {SHOP_PHONE && <p className="text-sm text-muted-foreground">{SHOP_PHONE}</p>}
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Shop</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-foreground">
                  Your cart
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">We accept</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Banknote className="size-4" /> Cash on Delivery
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="size-4" /> Whish Money
              </li>
              <li className="flex items-center gap-2">
                <Truck className="size-4" /> Delivery across Lebanon
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {SHOP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
