"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Block another member. Apple requires this for any social app — the
 * RLS policies in migration 00019 hide the blocked user's posts,
 * comments, and DMs from the blocker (and vice versa, since blocks
 * are mutual at the visibility layer).
 */
export async function blockUserAction(
  blockedProfileId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { error: "Approval required." };
  if (me.id === blockedProfileId) return { error: "You can't block yourself." };

  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: me.id, blocked_id: blockedProfileId });
  // 23505 = unique violation (already blocked). Treat as success.
  if (error && (error as any).code !== "23505") return { error: error.message };

  revalidatePath("/app/home");
  revalidatePath("/app/members");
  revalidatePath(`/app/members/${blockedProfileId}`);
  revalidatePath("/app/profile/blocked");
  return { success: true };
}

/** Unblock — used from the settings page. */
export async function unblockUserAction(
  blockedProfileId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "No profile." };

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", me.id)
    .eq("blocked_id", blockedProfileId);
  if (error) return { error: error.message };
  revalidatePath("/app/home");
  revalidatePath("/app/profile/blocked");
  return { success: true };
}
