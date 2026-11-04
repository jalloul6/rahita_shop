import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cookie-free anon client for public, cacheable reads (cached functions can't read cookies).
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
