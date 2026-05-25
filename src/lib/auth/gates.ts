import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** Get the current user's auth row + profile, or null. */
export async function getCurrentUser() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, profile: (profile ?? null) as Profile | null };
}

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
