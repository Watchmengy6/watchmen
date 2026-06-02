"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToAdmins } from "@/lib/push/send";

export type ReportTarget =
  | { kind: "user"; id: string }
  | { kind: "post"; id: string }
  | { kind: "comment"; id: string }
  | { kind: "thread_message"; id: string }
  | { kind: "message"; id: string };

const TARGET_COLS: Record<ReportTarget["kind"], string> = {
  user: "target_user_id",
  post: "target_post_id",
  comment: "target_comment_id",
  thread_message: "target_thread_message_id",
  message: "target_message_id",
};

/**
 * File a report against a user or piece of content. Required by Apple
 * for any social-feed app — reviewers want a clear in-app way for
 * members to flag bad behavior.
 */
export async function fileReportAction(input: {
  target: ReportTarget;
  reason: string;
  details?: string;
}): Promise<{ error?: string; success?: boolean }> {
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

  const reason = input.reason.trim();
  if (!reason) return { error: "Pick a reason." };

  const row: Record<string, unknown> = {
    reporter_id: me.id,
    reason: reason.slice(0, 200),
    details: input.details?.trim().slice(0, 2000) || null,
  };
  row[TARGET_COLS[input.target.kind]] = input.target.id;

  const { error } = await supabase.from("reports").insert(row);
  if (error) return { error: error.message };

  // Fire-and-forget admin push so leadership sees the report land in
  // real time. The /admin/reports queue is the deep-link target.
  void (async () => {
    try {
      await sendPushToAdmins({
        title: "New report filed",
        body: `Reason: ${reason}. Tap to review.`,
        url: "/admin/reports",
        tag: "admin-report",
      });
    } catch (e) {
      console.warn("[reports] admin push failed (non-fatal)", e);
    }
  })();

  return { success: true };
}

/**
 * Admin triage — mark a report as reviewed, dismissed, or actioned and
 * record what we did. Service-role client is fine here because the page
 * itself is admin-gated via requireAdmin.
 */
export async function reviewReportAction(input: {
  reportId: string;
  status: "reviewed" | "dismissed" | "actioned";
  action_taken?: string;
}): Promise<{ error?: string; success?: boolean }> {
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
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  const { error } = await supabase
    .from("reports")
    .update({
      status: input.status,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      action_taken: input.action_taken ?? null,
    })
    .eq("id", input.reportId);
  if (error) return { error: error.message };
  revalidatePath("/admin/reports");
  return { success: true };
}

/**
 * Suspend a member as a moderation action. Sets status='rejected' so RLS
 * gates immediately hide them. Use as a heavy hammer when a report is
 * actioned.
 */
export async function suspendUserAction(
  userProfileId: string,
): Promise<{ error?: string; success?: boolean }> {
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
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await admin
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userProfileId);
  if (error) return { error: error.message };
  revalidatePath("/admin/reports");
  revalidatePath("/admin/members");
  return { success: true };
}
