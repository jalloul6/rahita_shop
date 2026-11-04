import { Suspense } from "react";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Rahita Admin" },
  robots: { index: false, follow: false },
};

// Access is enforced in proxy.ts (session + is_admin) and again in each action/route handler.
// The layout itself reads no request data, so it stays part of the static shell.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row print:block">
      <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-r md:border-b-0 print:hidden">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <span className="text-lg font-semibold tracking-tight">Rahita Admin</span>
          <form action={signOut} className="md:hidden">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
        <div className="overflow-x-auto px-2 pb-2 md:px-3">
          <Suspense fallback={<div className="h-9" />}>
            <AdminNav />
          </Suspense>
        </div>
        <form action={signOut} className="hidden px-3 pt-4 md:block">
          <Button type="submit" variant="outline" className="w-full justify-start">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
    </div>
  );
}
