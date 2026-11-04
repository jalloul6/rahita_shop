import "server-only";
import { createClient } from "@/lib/supabase/server";

// For server actions / route handlers: returns an authenticated client only for admins.
export async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin === true ? supabase : null;
}
