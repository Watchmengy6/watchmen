"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { welcomeApproved } from "@/lib/mail/send";
import { sendPushToUser } from "@/lib/push/send";

async function ensureAdmin() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase };
  const { data: p } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!p || (p.role !== "admin" && p.role !== "super_admin")) {
    return { error: "Admin only.", supabase };
  }
  return { error: null, supabase };
}

export async function approveMemberAction(profileId: string) {
  const { error, supabase } = await ensureAdmin();
  if (error) return { error };

  // Look up the member's name + auth user id BEFORE flipping status so
  // we know who to welcome regardless of RLS shifts.
  const { data: target } = await supabase
    .from("profiles")
    .select("full_name, auth_user_id")
    .eq("id", profileId)
    .maybeSingle();

  const { error: rpcErr } = await supabase.rpc("approve_member", {
    p_target_profile_id: profileId,
  });
  if (rpcErr) return { error: rpcErr.message };

  revalidatePath("/admin/pending");
  revalidatePath("/admin/members");

  // Fire-and-forget welcome email. Email is best-effort — approval
  // already succeeded, so we never surface a send failure to the admin.
  if (target?.auth_user_id) {
    try {
      const admin = supabaseAdmin();
      const { data: userRes } = await admin.auth.admin.getUserById(target.auth_user_id);
      const memberEmail = userRes?.user?.email;
      if (memberEmail) {
        await welcomeApproved({
          to: memberEmail,
          fullName: target.full_name ?? "Brother",
        });
      }
      // Push too — they may have enabled it from /pending.
      await sendPushToUser({
        userId: profileId,
        payload: {
          title: "You've been approved 🎉",
          body: "Continue setting up your account.",
          url: "/app/home",
          tag: "approved",
        },
      });
    } catch (e) {
      console.warn("[approve] welcome email failed (non-fatal)", e);
    }
  }

  return { success: true };
}

export async function rejectMemberAction(profileId: string) {
  const { error, supabase } = await ensureAdmin();
  if (error) return { error };
  const { error: rpcErr } = await supabase.rpc("reject_member", {
    p_target_profile_id: profileId,
  });
  if (rpcErr) return { error: rpcErr.message };
  revalidatePath("/admin/pending");
  return { success: true };
}

export async function setRoleAction(profileId: string, role: "member" | "admin" | "super_admin") {
  const { error, supabase } = await ensureAdmin();
  if (error) return { error };
  const { error: rpcErr } = await supabase.rpc("set_role", {
    p_target_profile_id: profileId,
    p_new_role: role,
  });
  if (rpcErr) return { error: rpcErr.message };
  revalidatePath("/admin/members");
  return { success: true };
}

export async function deleteEventAction(eventId: string) {
  const { error, supabase } = await ensureAdmin();
  if (error) return { error };
  const { error: dErr } = await supabase.from("events").delete().eq("id", eventId);
  if (dErr) return { error: dErr.message };
  revalidatePath("/admin/events");
  revalidatePath("/app/events");
  return { success: true };
}

/**
 * Delete a group entirely (admin/super_admin only).
 *
 * FK cascades handle the cleanup automatically:
 *   - group_members: ON DELETE CASCADE (migration 00008)
 *   - threads (group chat) → thread_members + thread_messages: ON DELETE CASCADE
 *   - posts.tagged_group_id: ON DELETE SET NULL — group-tagged posts survive,
 *     they just lose the tag.
 *
 * RLS DELETE policy "groups admin/owner delete" (migration 00009) already
 * permits both admin and super_admin via public.is_admin(), so we don't need
 * a service-role client — the admin's own session is enough.
 */
export async function deleteGroupAction(groupId: string) {
  const { error, supabase } = await ensureAdmin();
  if (error) return { error };
  const { error: dErr } = await supabase.from("groups").delete().eq("id", groupId);
  if (dErr) return { error: dErr.message };
  revalidatePath("/admin/groups");
  revalidatePath("/app/groups");
  // The group's chat thread is gone too — invalidate the chats list.
  revalidatePath("/app/chats");
  return { success: true };
}
