"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Only allow redirects back into the admin area (blocks open-redirect via ?next=).
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value === "/admin" || value.startsWith("/admin/") ? value : "/admin";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) redirect("/login?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    redirect("/login?error=forbidden");
  }

  redirect(next);
}
