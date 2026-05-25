import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. NEVER import this in a client component.
 * Bypasses RLS — use only for trusted admin actions in server actions
 * or API routes, after you've checked the caller is an admin.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
