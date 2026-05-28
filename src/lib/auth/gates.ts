import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Get the current user's auth row + profile, or null.
 *
 * Wrapped in React.cache() so multiple callers within the same request
 * (e.g. the app layout + a child page both calling requireApproved())
 * share a single Supabase roundtrip instead of hammering auth.getUser()
 * and the me_full RPC twice per nav.
 */
export const getCurrentUser = cache(async () => {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };

  // Use the me_full() SECURITY DEFINER RPC so we can read email/phone/invite_code
  // (which are revoked from the authenticated role on the profiles table).
  const { data: rows } = await supabase.rpc("me_full");
  const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  return { user, profile: (profile ?? null) as Profile | null };
});

/** Require an authenticated, approved member. Redirect otherwise. */
export async function requireApproved() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");
  if (!profile || profile.status !== "approved") redirect("/pending");
  return { user, profile: profile! };
}

/** Require an admin or super_admin. */
export async function requireAdmin() {
  const { user, profile } = await requireApproved();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/app/home");
  }
  return { user, profile };
}
