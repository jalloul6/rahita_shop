import Link from "next/link";
import { CartLink } from "@/components/storefront/cart-link";
import { SHOP_NAME, SHOP_PHONE, SHOP_TAGLINE } from "@/lib/shop";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {SHOP_NAME}
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/" className="rounded-md px-3 py-2 hover:bg-muted">
              Home
            </Link>
            <Link href="/products" className="rounded-md px-3 py-2 hover:bg-muted">
              Shop
            </Link>
            <CartLink />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>
            {SHOP_NAME} · {SHOP_TAGLINE}
          </span>
          <span>Cash on delivery{SHOP_PHONE ? ` · ${SHOP_PHONE}` : ""}</span>
        </div>
      </footer>
    </div>
  );
}
