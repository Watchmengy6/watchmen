"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { welcomeApproved } from "@/lib/mail/send";

/** Service-role client — only used server-side to look up auth emails. */
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

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
