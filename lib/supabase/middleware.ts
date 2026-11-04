import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session cookie and guards /admin/*.
 * Admins are users listed in public.admin_users (checked via the is_admin() RPC).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser(): it validates the
  // token with Supabase Auth (unlike getSession) and refreshes it if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminArea) {
    let allowed = false;
    if (user) {
      const { data } = await supabase.rpc("is_admin");
      allowed = data === true;
    }

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", pathname);
      if (user) url.searchParams.set("error", "forbidden");

      const redirect = NextResponse.redirect(url);
      // keep any refreshed auth cookies on the redirect response
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  // Already-signed-in admin visiting /login → send to dashboard.
  if (pathname === "/login" && user && !request.nextUrl.searchParams.has("error")) {
    const { data } = await supabase.rpc("is_admin");
    if (data === true) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}
