"use server";
import { runInBackground } from "@/lib/utils/background";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { welcomeApproved } from "@/lib/mail/send";
import { sendPushToUser, sendPushToAllApproved } from "@/lib/push/send";

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

/**
 * SUPER-ADMIN ONLY — broadcast a push notification to every approved
 * member (built for Dustin, July 2026). The fan-out runs in the
 * background via runInBackground/waitUntil so the admin screen returns
 * instantly; the action reports how many members were targeted.
 * Members without notifications enabled are counted but unreachable.
 */
export async function sendBroadcastPushAction(input: {
  title: string;
  body: string;
}): Promise<{ error?: string; targeted?: number }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  // Deliberately STRICTER than ensureAdmin: broadcasts are the loudest
  // hammer in the app — super_admin (Dustin + Aaron) only.
  if (!me || me.role !== "super_admin") {
    return { error: "Super-admin only." };
  }

  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (!title) return { error: "Give the notification a title." };
  if (!body) return { error: "Write the message." };
  if (title.length > 80) return { error: "Title is too long (80 characters max)." };
  if (body.length > 300) return { error: "Message is too long (300 characters max)." };

  // Count the audience up front so the admin gets a real number back.
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  const targeted = Math.max(0, (count ?? 0) - 1); // minus the sender

  // Unique tag per blast — reusing a tag would make a second broadcast
  // REPLACE the first in the notification tray.
  const tag = `broadcast:${Date.now()}`;
  const senderProfileId = me.id;
  runInBackground(async () => {
    const r = await sendPushToAllApproved({
      actorProfileId: senderProfileId,
      payload: { title, body, url: "/app/home", tag },
    });
    console.log(`[broadcast] "${title}" fanned out to ${r.targeted} members`);
  });

  return { targeted };
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

  // TRULY fire-and-forget welcome email + push. The old code said
  // "fire-and-forget" but AWAITED getUserById → Resend → APNs serially
  // before returning — so every tap of Approve waited on three external
  // providers. With ~200 pending signups on event night (July 11) that
  // read as a frozen admin screen (Codex pre-launch audit). Approval
  // itself already committed via the RPC above; notifications are
  // best-effort in a detached task with their own error handling.
  if (target?.auth_user_id) {
    const targetAuthUserId = target.auth_user_id;
    const targetName = target.full_name ?? "Brother";
    runInBackground(async () => {
      try {
        const admin = supabaseAdmin();
        const { data: userRes } = await admin.auth.admin.getUserById(targetAuthUserId);
        const memberEmail = userRes?.user?.email;
        if (memberEmail) {
          await welcomeApproved({ to: memberEmail, fullName: targetName });
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
        console.warn("[approve] welcome email/push failed (non-fatal)", e);
      }
    });
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
