"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Self-serve account deletion. Apple App Store requires this for any
 * app that lets users create accounts — must be in-app, not just
 * "email us to delete."
 *
 * Flow:
 *   1. SECURITY DEFINER soft_delete_self_profile() scrubs the profile
 *      row (PII out, status='rejected', deleted_at=now) and drops
 *      push subscriptions. We keep the profile row as a tombstone so
 *      old posts/messages don't orphan.
 *   2. Service-role admin client deletes the auth.users row so the
 *      user can never sign back in.
 *   3. Sign out (clears cookies) and redirect to /login.
 *
 * Schema FKs cascade-delete most user-owned data (groups, RSVPs, etc)
 * but we *intentionally* leave posts/comments/messages attached to the
 * scrubbed profile so historical conversations stay coherent.
 */
export async function deleteMyAccountAction(): Promise<{ error?: string }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // 1. Scrub PII on the profile.
  const { error: scrubErr } = await supabase.rpc("soft_delete_self_profile");
  if (scrubErr) return { error: scrubErr.message };

  // 2. Remove the auth row so future logins fail. Needs service role
  // because regular users don't have permission on the auth schema.
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      // Profile is already scrubbed at this point — log but proceed
      // to sign-out. The user is effectively gone from the app even if
      // the auth row stuck around (status='rejected' blocks sign-in
      // via our gate).
      console.warn("[account.delete] auth user delete failed", delErr);
    }

    // Remove the member's avatar files. The profile pic is PII and we've
    // already nulled profile_photo_url, so the stored object is orphaned.
    // Uploaded avatars live under `<auth user id>/...` in the avatars
    // bucket (see uploadAvatar in lib/uploads/client.ts). Best-effort —
    // a failure here must not block account deletion.
    // NOTE: chat-media / post images are intentionally NOT deleted; they're
    // attached to posts/comments/messages we keep so historical
    // conversations stay coherent under the "Deleted member" tombstone.
    try {
      const { data: avatarFiles } = await admin.storage
        .from("avatars")
        .list(user.id);
      if (avatarFiles && avatarFiles.length > 0) {
        await admin.storage
          .from("avatars")
          .remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
      }
    } catch (e) {
      console.warn("[account.delete] avatar cleanup failed (non-fatal)", e);
    }
  } catch (e) {
    console.warn("[account.delete] admin deleteUser threw (non-fatal)", e);
  }

  // 3. Sign out and redirect.
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
