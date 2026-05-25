"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

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
  const { error: rpcErr } = await supabase.rpc("approve_member", {
    p_target_profile_id: profileId,
  });
  if (rpcErr) return { error: rpcErr.message };
  revalidatePath("/admin/pending");
  revalidatePath("/admin/members");
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
